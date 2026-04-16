import { RIDE_STATUS, PAYMENT_METHOD, WAIT_TIMES, ARRIVAL_STATUS } from '../constants/index.js';
import { updateDriverBalance, applyExtraWaitCharge, applyPenaltyToCustomer } from '../services/balanceService.js';
import Driver from '../models/Driver.js';

// ======================
// 1. Marcar llegada al origen (con validación de geolocalización)
// ======================
export const markArrival = async (req, res) => {
  try {
    const { rideId, coordinates } = req.body; // coordinates [lng, lat] del conductor
    const ride = await Ride.findById(rideId).populate('driver');
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    if (ride.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No eres el conductor asignado' });
    }
    if (ride.status !== 'accepted') {
      return res.status(400).json({ message: 'El viaje no está en estado aceptado' });
    }

    // Obtener coordenadas del origen
    const originCoords = ride.origin.location.coordinates; // [lng, lat]
    const distance = getDistanceFromLatLonInMeters(
      originCoords[1], originCoords[0],
      coordinates[1], coordinates[0]
    );

    if (distance > 10) {
      return res.status(400).json({ message: `No estás lo suficientemente cerca del origen. Distancia: ${Math.round(distance)}m` });
    }

    // Registrar llegada y comenzar temporizador de espera normal
    ride.arrivalAtOrigin = new Date();
    ride.waitStartTime = new Date();
    ride.status = 'waiting_normal'; // nuevo estado (puedes agregarlo al enum)
    await ride.save();

    // Emitir evento por socket
    const io = req.app.get('io');
    io.to(`ride-${rideId}`).emit('driverArrived', { rideId, waitStart: ride.waitStartTime });

    res.json({ message: 'Llegada registrada, comenzando tiempo de espera', ride });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar llegada' });
  }
};

// ======================
// 2. Iniciar viaje (solo si el cliente subió, se detiene el temporizador)
// ======================
export const startRide = async (req, res) => {
  // ... mantén tu lógica actual, pero adicionalmente:
  // si el viaje estaba en 'waiting_normal' o 'waiting_extra', detener los tiempos
  if (ride.status === 'waiting_normal' || ride.status === 'waiting_extra') {
    // Si había espera extra, calcular recargo hasta este momento
    if (ride.extraWaitStartTime) {
      await applyExtraWaitCharge(ride, driver);
    }
    ride.status = 'started';
    ride.startedAt = Date.now();
    await ride.save();
  }
  // ... resto
};

// ======================
// 3. Cancelar viaje por espera excesiva (conductor)
// ======================
export const cancelRideDueToWait = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId).populate('driver');
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    if (ride.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado' });
    }

    // Verificar que haya pasado suficiente tiempo desde la llegada
    if (!ride.arrivalAtOrigin) {
      return res.status(400).json({ message: 'Aún no has llegado al origen' });
    }
    const waitElapsed = Date.now() - ride.arrivalAtOrigin;
    if (waitElapsed < WAIT_TIMES.CANCEL_AFTER_MS) {
      const remaining = Math.ceil((WAIT_TIMES.CANCEL_AFTER_MS - waitElapsed) / 60000);
      return res.status(400).json({ message: `Debes esperar al menos ${remaining} minutos más antes de cancelar` });
    }

    // Aplicar penalización al cliente (se guarda como deuda)
    await applyPenaltyToCustomer(ride);

    // Calcular y aplicar recargo por espera extra acumulado hasta ahora
    let extraCharge = 0;
    if (ride.extraWaitStartTime) {
      extraCharge = await applyExtraWaitCharge(ride, ride.driver);
    }

    // Cambiar estado del viaje
    ride.status = 'cancelled_by_driver_wait';
    ride.waitCancelled = true;
    await ride.save();

    // Liberar al conductor (busy = false, isAvailable = true)
    await Driver.findByIdAndUpdate(ride.driver._id, { busy: false, isAvailable: true, currentRideId: null });

    const io = req.app.get('io');
    io.to(`ride-${rideId}`).emit('rideCancelledByDriver', { rideId, reason: 'excessive_wait', penalty: WAIT_TIMES.PENALTY_AMOUNT });

    res.json({ message: 'Viaje cancelado por tiempo de espera excesivo', extraCharge, penalty: WAIT_TIMES.PENALTY_AMOUNT });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cancelar viaje' });
  }
};

// Función auxiliar para calcular distancia en metros (Haversine)
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metros
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}