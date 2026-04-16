import Ride from '../models/Ride.js';
import { RIDE_STATUS, WAIT_TIMES } from '../constants/index.js';
import { applyExtraWaitCharge } from './balanceService.js';
import Driver from '../models/Driver.js';

export const processWaitingTransitions = async () => {
  const now = Date.now();

  // 1. Viajes en espera normal que superaron 3 minutos
  const normalWaits = await Ride.find({
    status: 'waiting_normal',
    waitStartTime: { $lte: new Date(now - WAIT_TIMES.NORMAL_WAIT_MS) },
  }).populate('driver');

  for (const ride of normalWaits) {
    ride.status = 'waiting_extra';
    ride.extraWaitStartTime = new Date();
    await ride.save();
    // Notificar al conductor y cliente por socket
    const io = req.app.get('io'); // o pasar io como parámetro
    io.to(`ride-${ride._id}`).emit('waitingExtraStarted', { rideId: ride._id });
  }

  // 2. Viajes en espera extra que superaron 10 minutos adicionales (total 13)
  // La cancelación la debe iniciar el conductor manualmente, pero podemos
  // enviar una notificación automática.
  const extraWaits = await Ride.find({
    status: 'waiting_extra',
    extraWaitStartTime: { $lte: new Date(now - WAIT_TIMES.EXTRA_WAIT_MS) },
  });
  for (const ride of extraWaits) {
    // Emitir evento para que el conductor sepa que ya puede cancelar
    const io = req.app.get('io');
    io.to(`ride-${ride._id}`).emit('canCancelDueToWait', { rideId: ride._id });
  }
};