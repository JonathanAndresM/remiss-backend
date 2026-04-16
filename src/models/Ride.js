import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  origin: {
    address: String,
    location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] },
  },
  destination: {
    address: String,
    location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] },
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'waiting_normal', 'waiting_extra', 'started', 'completed', 'cancelled', 'cancelled_by_driver_wait', 'blocked_pin'],
    default: 'requested'
  },
  price: Number,          // Precio total pagado por el cliente
  distance: Number,
  duration: Number,
  paymentMethod: { type: String, enum: ['cash', 'card'], default: 'cash' },
  paymentId: { type: String, default: null },   // ID de pago de Mercado Pago (si aplica)
  createdAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
  arrivalAtOrigin: { type: Date, default: null },       // momento en que el conductor llegó al origen
  waitStartTime: { type: Date, default: null },         // inicio del tiempo de espera normal
  extraWaitStartTime: { type: Date, default: null },    // inicio del tiempo extra
  extraChargeAccumulated: { type: Number, default: 0 }, // recargo por espera extra acumulado (para el conductor)
  waitCancelled: { type: Boolean, default: false },     // si fue cancelado por espera
  penaltyAppliedToCustomer: { type: Boolean, default: false }, // si se aplicó penalización
  companyCommission: { type: Number, default: 0 },   // 15% del precio
  driverEarning: { type: Number, default: 0 },       // 85% del precio
  settled: { type: Boolean, default: false },        // Si ya fue incluido en una liquidación semanal
  weekStart: Date,   // Semana a la que pertenece (lunes de esa semana)
  pinCode: { type: String, default: null },      // PIN de 4 dígitos
  pinExpiresAt: { type: Date, default: null },   // Fecha de expiración (ej. 5 minutos)
  pinVerified: { type: Boolean, default: false }, // Si el conductor ya verificó el PIN
  failedPinAttempts: { type: Number, default: 0 },
  lastFailedPinAttempt: { type: Date, default: null },
});

rideSchema.index({ status: 1, 'origin.location': '2dsphere' });
rideSchema.index({ driver: 1, completedAt: 1 });
rideSchema.index({ settled: 1 });

const Ride = mongoose.model('Ride', rideSchema);
export default Ride;