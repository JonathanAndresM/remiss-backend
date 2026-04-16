import Driver from '../models/Driver.js';
import BalanceTransaction from '../models/BalanceTransaction.js';
import { PAYMENT_METHOD, FARE_CONFIG, WAIT_TIMES } from '../constants/index.js';
import { calculateCommissions, shouldSuspendDriver } from '../utils/fareCalculator.js';

/**
 * Actualiza el balance del conductor al completar un viaje.
 * @param {Object} ride - Objeto del viaje (debe tener price, paymentMethod, driver, _id)
 * @returns {Promise<Object>} { driver, balanceChange, transactionType }
 */
export const updateDriverBalanceForRide = async (ride) => {
  const driver = await Driver.findOne({ user: ride.driver });
  if (!driver) throw new Error('Conductor no encontrado');

  const { companyCommission, driverEarning } = calculateCommissions(ride.price);

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
  await driver.save();

  await BalanceTransaction.create({
    driver: driver._id,
    ride: ride._id,
    amount: balanceChange,
    type: transactionType,
    description: `Viaje #${ride._id} - ${ride.paymentMethod === PAYMENT_METHOD.CARD ? 'digital' : 'efectivo'}`,
  });

  // Verificar suspensión
  const shouldSuspend = shouldSuspendDriver(driver.balance);
  if (shouldSuspend && !driver.suspended) {
    driver.suspended = true;
    driver.suspensionReason = `Deuda acumulada de ${Math.abs(driver.balance)} pesos. Supera el límite de 50,000.`;
    await driver.save();
  }

  return { driver, balanceChange, transactionType };
};

/**
 * Obtiene el historial de transacciones de balance de un conductor.
 * @param {string} driverId - ID del conductor
 * @param {number} limit - límite de registros
 * @returns {Promise<Array>}
 */
export const getDriverBalanceHistory = async (driverId, limit = 50) => {
  const transactions = await BalanceTransaction.find({ driver: driverId })
    .populate('ride', 'origin destination price status')
    .sort({ createdAt: -1 })
    .limit(limit);
  return transactions;
};

/**
 * Realiza un pago semanal a un conductor (resta del balance y registra transacción).
 * @param {string} driverId - ID del conductor
 * @param {number} amount - Monto a pagar (positivo)
 * @param {string} description - Descripción del pago
 * @returns {Promise<Object>}
 */
export const processDriverPayment = async (driverId, amount, description) => {
  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error('Conductor no encontrado');
  if (driver.balance < amount) {
    throw new Error('Saldo insuficiente para realizar el pago');
  }

  driver.balance -= amount;
  await driver.save();

  const transaction = await BalanceTransaction.create({
    driver: driverId,
    amount: -amount,
    type: 'settlement_payment',
    description,
  });

  return { driver, transaction };
};

/**
 * Actualiza el balance de un conductor después de un viaje o recargo
 * @param {ObjectId} driverId 
 * @param {number} amountChange 
 * @param {string} type 
 * @param {ObjectId} rideId 
 * @param {string} description 
 */
export const updateDriverBalance = async (driverId, amountChange, type, rideId = null, description = '') => {
  const driver = await Driver.findById(driverId);
  if (!driver) throw new Error('Conductor no encontrado');
  driver.balance += amountChange;
  await driver.save();

  await BalanceTransaction.create({
    driver: driverId,
    ride: rideId,
    amount: amountChange,
    type,
    description,
  });
  return driver.balance;
};

/**
 * Aplica recargo por espera extra al conductor (sin comisión)
 */
export const applyExtraWaitCharge = async (ride, driver) => {
  const extraMinutes = Math.ceil((Date.now() - ride.extraWaitStartTime) / 60000);
  const chargeAmount = extraMinutes * WAIT_TIMES.EXTRA_CHARGE_PER_MINUTE;
  if (chargeAmount <= 0) return 0;

  // Actualizar balance del conductor (positivo, sin comisión)
  await updateDriverBalance(
    driver._id,
    chargeAmount,
    'extra_wait_charge',
    ride._id,
    `Recargo por espera extra de ${extraMinutes} minutos`
  );

  // Guardar el monto acumulado en el viaje (opcional)
  ride.extraChargeAccumulated = (ride.extraChargeAccumulated || 0) + chargeAmount;
  await ride.save();

  return chargeAmount;
};

/**
 * Aplica penalización al cliente (se guarda en el usuario como deuda)
 * Se cobrará en el próximo viaje del cliente.
 */
export const applyPenaltyToCustomer = async (ride) => {
  const user = await User.findById(ride.customer);
  if (!user) return;
  user.pendingPenalty = (user.pendingPenalty || 0) + WAIT_TIMES.PENALTY_AMOUNT;
  await user.save();
  ride.penaltyAppliedToCustomer = true;
  await ride.save();
};