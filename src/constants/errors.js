// Mensajes de error comunes
export const ERROR_MESSAGES = {
  // Autenticación
  UNAUTHORIZED: 'No autorizado. Token no proporcionado o inválido.',
  USER_NOT_FOUND: 'Usuario no encontrado.',
  INVALID_CREDENTIALS: 'Credenciales inválidas.',
  EMAIL_ALREADY_EXISTS: 'El email ya está registrado.',
  FORBIDDEN: 'No tienes permisos para acceder a este recurso',

  // Usuarios
  USER_ALREADY_EXISTS: 'El usuario ya existe',
  USER_NOT_CREATED: 'Error al crear usuario',

  // Viajes
  RIDE_NOT_FOUND: 'Viaje no encontrado.',
  RIDE_NOT_AVAILABLE: 'El viaje ya no está disponible.',
  CANNOT_CANCEL_RIDE: 'No se puede cancelar el viaje en este estado.',
  NOT_DRIVER_OF_RIDE: 'No eres el conductor asignado a este viaje.',
  NOT_CUSTOMER_OF_RIDE: 'No eres el cliente de este viaje.',
  DISTANCE_TOO_FAR: 'No estás lo suficientemente cerca del origen.',
  RIDE_NOT_IN_PROGRESS: 'El viaje no está en curso',

  // Pagos
  INSUFFICIENT_BALANCE: 'Saldo insuficiente en Mercado Pago.',
  PAYMENT_FAILED: 'El pago fue rechazado.',
  PAYMENT_ERROR: 'No se pudo procesar el pago',

  // Conductores
  DRIVER_PROFILE_NOT_FOUND: 'Perfil de conductor no encontrado',
  DRIVER_SUSPENDED: 'Conductor suspendido por deuda',
  DRIVER_NOT_AVAILABLE: 'El conductor no está disponible.',

  // Ubicación
  INVALID_COORDINATES: 'Coordenadas inválidas',
  LOCATION_PERMISSION_DENIED: 'Permiso de ubicación denegado',

  // General
  SERVER_ERROR: 'Error interno del servidor.',
  INVALID_DATA: 'Datos inválidos.',
  VALIDATION_ERROR: 'Error de validación',
};

// Códigos HTTP
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};