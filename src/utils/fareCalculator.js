import { FARE_CONFIG } from '../constants/index.js';

/**
 * Calcula el precio total de un viaje basado en la distancia (km)
 * @param {number} distanceInKm 
 * @returns {number} Precio redondeado
 */
export const calculateFare = (distanceInKm) => {
  const total = FARE_CONFIG.BASE_FARE + (distanceInKm * FARE_CONFIG.RATE_PER_KM);
  return Math.ceil(total);
};

/**
 * Calcula la comisión de la empresa y la ganancia del conductor
 * @param {number} price 
 * @returns {Object} { companyCommission, driverEarning }
 */
export const calculateCommissions = (price) => {
  const companyCommission = price * FARE_CONFIG.COMPANY_COMMISSION_PERCENT;
  const driverEarning = price * FARE_CONFIG.DRIVER_EARNING_PERCENT;
  return { companyCommission, driverEarning };
};

/**
 * Verifica si un conductor debe ser suspendido por deuda excesiva
 * @param {number} currentBalance 
 * @returns {boolean}
 */
export const shouldSuspendDriver = (currentBalance) => {
  return currentBalance < FARE_CONFIG.DEBT_LIMIT;
};