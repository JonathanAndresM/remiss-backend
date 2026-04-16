// Estados de viaje
export const RIDE_STATUS = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  STARTED: 'started',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// Métodos de pago
export const PAYMENT_METHOD = {
  CASH: 'cash',
  CARD: 'card',
};

// Roles de usuario
export const USER_ROLE = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

// Configuración de tarifas
export const FARE_CONFIG = {
  BASE_FARE: 50,        // tarifa base en tu moneda local
  RATE_PER_KM: 10,      // costo por kilómetro
  COMPANY_COMMISSION_PERCENT: 0.15,  // 15%
  DRIVER_EARNING_PERCENT: 0.85,      // 85%
  DEBT_LIMIT: -50000,   // límite de deuda en efectivo para suspender conductor
};

// Tiempos de espera (en milisegundos)
export const WAIT_TIMES = {
  NORMAL_WAIT_MS: 3 * 60 * 1000,       // 3 minutos
  EXTRA_WAIT_MS: 10 * 60 * 1000,       // 10 minutos extra (total 13 min)
  CANCEL_AFTER_MS: 13 * 60 * 1000,     // tiempo total para poder cancelar
  EXTRA_CHARGE_PER_MINUTE: 50,         // recargo por minuto extra (ejemplo)
  PENALTY_AMOUNT: 200,                 // sanción por cancelación por espera excesiva
};

// Estados de llegada del conductor
export const ARRIVAL_STATUS = {
  NOT_ARRIVED: 'not_arrived',
  ARRIVED: 'arrived',
  WAITING: 'waiting',
  EXTRA_WAITING: 'extra_waiting',
  CANCELLED_BY_DRIVER: 'cancelled_by_driver',
};