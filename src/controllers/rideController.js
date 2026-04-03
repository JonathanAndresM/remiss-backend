import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';
import User from '../models/User.js';

// @desc    Solicitar un viaje
// @route   POST /api/rides
export const requestRide = async (req, res) => {
  try {
    const { origin, destination, paymentMethod } = req.body;

    // Por simplicidad, calculamos un precio fijo o podrías llamar a una API de mapas
    // Aquí simulamos precio y distancia
    const price = 50; // Precio base
    const distance = 5; // km simulado

    const ride = await Ride.create({
      customer: req.user._id,
      origin,
      destination,
      price,
      distance,
      paymentMethod: paymentMethod || 'cash',
      status: 'requested',
    });

    // Emitir evento vía Socket.io para que los conductores cercanos reciban la solicitud
    const io = req.app.get('io');
    if (io) {
      // Buscar conductores disponibles cercanos (pendiente implementar)
      // Por ahora emitimos a todos los conductores conectados (luego lo refinaremos)
      io.to('drivers').emit('newRideRequest', {
        rideId: ride._id,
        origin: ride.origin,
        destination: ride.destination,
        price: ride.price,
      });
    }

    res.status(201).json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al solicitar viaje' });
  }
};

// @desc    Obtener viaje por ID
// @route   GET /api/rides/:id
export const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('driver', 'name phone');
    if (!ride) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }
    // Verificar permisos: solo el cliente, el conductor o admin
    if (
      ride.customer._id.toString() !== req.user._id.toString() &&
      (ride.driver && ride.driver._id.toString() !== req.user._id.toString()) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener viaje' });
  }
};

// @desc    Cancelar viaje (solo si está en estado requested)
// @route   PUT /api/rides/:id/cancel
export const cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }
    if (ride.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'No se puede cancelar el viaje en este estado' });
    }
    ride.status = 'cancelled';
    await ride.save();
    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cancelar viaje' });
  }
};

// @desc    Aceptar viaje (conductor)
// @route   PUT /api/rides/:id/accept
export const acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }
    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'El viaje ya no está disponible' });
    }
    ride.driver = req.user._id;
    ride.status = 'accepted';
    await ride.save();

    // Actualizar disponibilidad del conductor a false (opcional)
    await Driver.findOneAndUpdate({ user: req.user._id }, { isAvailable: false });

    // Emitir evento al cliente para notificar que fue aceptado
    const io = req.app.get('io');
    if (io) {
      io.to(`ride-${ride._id}`).emit('rideAccepted', { rideId: ride._id, driverId: req.user._id });
    }

    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al aceptar viaje' });
  }
};

// @desc    Iniciar viaje
// @route   PUT /api/rides/:id/start
export const startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }
    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No eres el conductor asignado' });
    }
    if (ride.status !== 'accepted') {
      return res.status(400).json({ message: 'El viaje no está en estado aceptado' });
    }
    ride.status = 'started';
    ride.startedAt = Date.now();
    await ride.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`ride-${ride._id}`).emit('rideStarted', { rideId: ride._id });
    }

    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar viaje' });
  }
};

// @desc    Completar viaje
// @route   PUT /api/rides/:id/complete
export const completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }
    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No eres el conductor asignado' });
    }
    if (ride.status !== 'started') {
      return res.status(400).json({ message: 'El viaje no está en curso' });
    }
    ride.status = 'completed';
    ride.completedAt = Date.now();
    await ride.save();

    // Liberar conductor
    await Driver.findOneAndUpdate({ user: req.user._id }, { isAvailable: true, $inc: { totalTrips: 1 } });

    const io = req.app.get('io');
    if (io) {
      io.to(`ride-${ride._id}`).emit('rideCompleted', { rideId: ride._id });
    }

    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al completar viaje' });
  }
};