import crypto from 'crypto';
import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';
import BalanceTransaction from '../models/BalanceTransaction.js';
import { createMercadoPagoPayment } from '../config/mercadopago.js';
import { getDistanceAndDuration } from '../services/mapsService.js';
import { RIDE_STATUS, PAYMENT_METHOD, FARE_CONFIG, WAIT_TIMES } from '../constants/index.js';
import { calculateFare, calculateCommissions, shouldSuspendDriver } from '../utils/fareCalculator.js';
import { updateDriverBalance, applyExtraWaitCharge, applyPenaltyToCustomer } from '../services/balanceService.js';
import { sendPushNotification } from '../services/fcmService.js';
import { sendSMS } from '../services/smsService.js';

// @desc    Solicitar un viaje
export const requestRide = async (req, res) => {
  try {
    const { origin, destination, paymentMethod } = req.body;

    // 1. Calcular distancia y precio en tiempo real
    const { distance, duration } = await getDistanceAndDuration(origin, destination);
    const price = calculateFare(distance);

    // 2. Si el método de pago es digital, procesar el pago con Mercado Pago
    let paymentId = null;
    if (paymentMethod === PAYMENT_METHOD.CARD) {
      const paymentResult = await createMercadoPagoPayment({
        amount: price,
        description: `Viaje desde ${origin.address} hasta ${destination.address}`,
        payerEmail: req.user.email,
      });
      if (paymentResult.status !== 'approved') {
        return res.status(400).json({ message: 'Saldo insuficiente o pago rechazado' });
      }
      paymentId = paymentResult.id;
    }

    // 3. Crear el viaje en la base de datos
    const ride = await Ride.create({
      customer: req.user._id,
      origin,
      destination,
      price,
      distance,
      duration,
      paymentMethod: paymentMethod || PAYMENT_METHOD.CASH,
      paymentId,
      status: RIDE_STATUS.REQUESTED,
    });

    // 4. Emitir evento a los conductores
    const io = req.app.get('io');
    if (io) {
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
    res.status(500).json({ message: error.message || 'Error al solicitar viaje' });
  }
};

// @desc    Obtener viaje por ID
export const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('customer', 'name phone')
      .populate('driver', 'name phone');
    if (!ride) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }
    // Verificar permisos
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
export const cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }
    if (ride.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (ride.status !== RIDE_STATUS.REQUESTED) {
      return res.status(400).json({ message: 'No se puede cancelar el viaje en este estado' });
    }
    ride.status = RIDE_STATUS.CANCELLED;

    await Driver.findOneAndUpdate(
      { user: req.user._id }, 
      { busy: false, isAvailable: true, currentRideId: null }
    );

    await ride.save();
    res.json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cancelar viaje' });
  }
};

// @desc    Aceptar viaje (conductor)
export const acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ message: 'Viaje no encontrado' });
    }
    if (ride.status !== RIDE_STATUS.REQUESTED) {
      return res.status(400).json({ message: 'El viaje ya no está disponible' });
    }
    ride.driver = req.user._id;
    ride.status = RIDE_STATUS.ACCEPTED;
    await ride.save();

    await Driver.findOneAndUpdate(
      { user: req.user._id }, 
      { isAvailable: false, busy: true, currentRideId: ride._id }
    );

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

// Función auxiliar para generar PIN de 4 dígitos
const generatePinCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// @desc    Iniciar viaje
export const startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No eres el conductor asignado' });
    }
    if (ride.status !== RIDE_STATUS.ACCEPTED) {
      return res.status(400).json({ message: 'El viaje no está en estado aceptado' });
    }

    // Generar PIN de 4 dígitos (expira en 5 minutos)
    const pin = generatePinCode();
    ride.pinCode = pin;
    ride.pinExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
    ride.status = RIDE_STATUS.STARTED;
    ride.startedAt = Date.now();
    await ride.save();

    // Actualizar conductor como ocupado
    await Driver.findOneAndUpdate(
      { user: req.user._id },
      { busy: true, currentRideId: ride._id }
    );

    // Emitir evento al cliente (usuario) con el PIN
    const io = req.app.get('io');
    io.to(`ride-${ride._id}`).emit('rideStarted', { 
      rideId: ride._id, 
      pinCode: pin,
      expiresAt: ride.pinExpiresAt 
    });

    // Enviar notificación push y SMS aquí (llamar a servicios externos)

    const customerPush = await User.findById(ride.customer).select('fcmToken');
    if (customerPush?.fcmToken) {
      await sendPushNotification(
        customerPush.fcmToken,
        '🚖 Tu viaje ha comenzado',
        `Tu PIN de verificación es: ${pin}. Compártelo con el conductor al finalizar.`,
        { rideId: ride._id.toString(), pinCode: pin } // data opcional
      );
    } else {
      console.warn(`No se encontró FCM token para el cliente ${ride.customer}`);
    }
    
    // Buscar el número de teléfono del cliente
    const customerSms = await User.findById(ride.customer).select('phone');
    if (customerSms?.phone) {
      await sendSMS(
        customerSms.phone,
        `Tu viaje ha comenzado. El PIN de verificación es: ${pin}. Compártelo con el conductor al finalizar.`
      );
    } else {
      console.warn(`No se encontró número de teléfono para el cliente ${ride.customer}`);
    }

    res.json({ ride, message: 'Viaje iniciado. PIN enviado al cliente.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al iniciar viaje' });
  }
};

// @desc    Completar viaje (actualiza balance, comisiones y verifica suspensión)
export const completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No eres el conductor asignado' });
    }
    if (ride.status !== RIDE_STATUS.STARTED) {
      return res.status(400).json({ message: 'El viaje no está en curso' });
    }

    ride.status = RIDE_STATUS.COMPLETED;
    ride.completedAt = Date.now();
    
    const { companyCommission, driverEarning } = calculateCommissions(ride.price);
    ride.companyCommission = companyCommission;
    ride.driverEarning = driverEarning;
    
    await ride.save();

    const { driver, balanceChange, transactionType } = await updateDriverBalanceForRide(ride);

    await Driver.findOneAndUpdate(
      { user: req.user._id }, 
      { busy: false, isAvailable: true, currentRideId: null }
    );

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

// @desc    Estimar precio antes de solicitar viaje
export const estimatePrice = async (req, res) => {
  try {
    const { origin, destination } = req.body;
    const { distance, duration } = await getDistanceAndDuration(origin, destination);
    const price = calculateFare(distance);
    res.json({ price, distance, duration });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Error al calcular precio' });
  }
};

export const resendPinCode = async (req, res) => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    if (ride.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    if (ride.status !== RIDE_STATUS.STARTED) {
      return res.status(400).json({ message: 'El viaje no está en curso' });
    }

    // Generar nuevo PIN
    const newPin = generatePinCode();
    ride.pinCode = newPin;
    ride.pinExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    ride.failedPinAttempts = 0; // Reiniciar intentos fallidos
    await ride.save();

    const io = req.app.get('io');
    io.to(`ride-${ride._id}`).emit('pinResent', {
      rideId: ride._id,
      pinCode: newPin,
      expiresAt: ride.pinExpiresAt,
    });

    // Opcional: enviar nuevamente notificación push y SMS
    // await sendPushNotification(ride.customer, `Tu nuevo PIN es ${newPin}`);
    // await sendSMS(ride.customerPhone, `Tu nuevo PIN de verificación es ${newPin}`);

    res.json({ message: 'Nuevo PIN enviado al cliente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al reenviar PIN' });
  }
};

export const completeRideWithPin = async (req, res) => {
  try {
    const { rideId, pinCode } = req.body;
    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'No eres el conductor asignado' });
    }
    if (ride.status !== RIDE_STATUS.STARTED) {
      return res.status(400).json({ message: 'El viaje no está en curso' });
    }

    // Verificar si el viaje está bloqueado por intentos fallidos
    if (ride.status === 'blocked_pin') {
      const blockDurationMinutes = 15;
      const blockEnd = new Date(ride.lastFailedPinAttempt.getTime() + blockDurationMinutes * 60000);
      if (new Date() < blockEnd) {
        const remaining = Math.ceil((blockEnd - new Date()) / 60000);
        return res.status(400).json({ message: `Demasiados intentos fallidos. Espera ${remaining} minutos.` });
      } else {
        // Desbloquear después del tiempo
        ride.status = RIDE_STATUS.STARTED;
        ride.failedPinAttempts = 0;
        await ride.save();
      }
    }

    // Verificar PIN
    if (!ride.pinCode || ride.pinCode !== pinCode) {
      // Incrementar contador de intentos fallidos
      ride.failedPinAttempts = (ride.failedPinAttempts || 0) + 1;
      ride.lastFailedPinAttempt = new Date();
      await ride.save();

      const MAX_ATTEMPTS = 3;
      const remainingAttempts = MAX_ATTEMPTS - ride.failedPinAttempts;
      let message = `PIN incorrecto. Te quedan ${remainingAttempts} intentos.`;
      if (ride.failedPinAttempts >= MAX_ATTEMPTS) {
        ride.status = 'blocked_pin';
        await ride.save();
        message = 'Demasiados intentos fallidos. El viaje ha sido bloqueado por 15 minutos. Contacta a soporte.';
        // Notificar al conductor vía socket
        const io = req.app.get('io');
        io.to(`ride-${ride._id}`).emit('pinBlocked', { rideId: ride._id });
      }
      return res.status(400).json({ message });
    }

    // Verificar expiración del PIN
    if (new Date() > new Date(ride.pinExpiresAt)) {
      return res.status(400).json({ message: 'El PIN ha expirado. Solicita uno nuevo desde la app del cliente.' });
    }

    // Marcar PIN como verificado
    ride.pinVerified = true;

    // Calcular comisiones y ganancias
    const { companyCommission, driverEarning } = calculateCommissions(ride.price);
    ride.companyCommission = companyCommission;
    ride.driverEarning = driverEarning;
    ride.status = RIDE_STATUS.COMPLETED;
    ride.completedAt = Date.now();
    await ride.save();

    // Actualizar balance del conductor según método de pago
    const driver = await Driver.findOne({ user: ride.driver });
    if (!driver) return res.status(404).json({ message: 'Conductor no encontrado' });

    let balanceChange = 0;
    let transactionType = '';
    if (ride.paymentMethod === PAYMENT_METHOD.CARD) {
      balanceChange = driverEarning;
      transactionType = 'ride_digital';
    } else {
      balanceChange = -companyCommission;
      transactionType = 'ride_cash';
    }

    driver.balance += balanceChange;
    driver.busy = false;
    driver.isAvailable = true;
    driver.currentRideId = null;
    await driver.save();

    // Registrar transacción de balance
    await BalanceTransaction.create({
      driver: driver._id,
      ride: ride._id,
      amount: balanceChange,
      type: transactionType,
      description: `Viaje #${ride._id} - PIN verificado`,
    });

    // Verificar suspensión por deuda excesiva
    if (shouldSuspendDriver(driver.balance)) {
      driver.suspended = true;
      driver.suspensionReason = `Deuda acumulada de ${Math.abs(driver.balance)} pesos. Supera el límite de 50,000.`;
      await driver.save();
    }

    // Emitir evento de viaje completado
    const io = req.app.get('io');
    io.to(`ride-${ride._id}`).emit('rideCompleted', { rideId: ride._id });

    // Limpiar PIN del viaje (opcional por seguridad)
    ride.pinCode = null;
    ride.pinExpiresAt = null;
    await ride.save();

    res.json({ message: 'Viaje completado correctamente', ride });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al completar viaje' });
  }
};

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
    ride.status = 'waiting_normal'; // nuevo estado (debes agregarlo al enum)
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
// 2. Cancelar viaje por espera excesiva (conductor)
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
    const CANCEL_AFTER_MS = 13 * 60 * 1000; // 13 minutos total
    if (waitElapsed < CANCEL_AFTER_MS) {
      const remaining = Math.ceil((CANCEL_AFTER_MS - waitElapsed) / 60000);
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