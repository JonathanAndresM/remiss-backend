import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  vehicle: {
    brand: String,
    model: String,
    plate: String,
    color: String,
  },
  licenseNumber: String,
  isAvailable: { type: Boolean, default: true },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  rating: { type: Number, default: 5 },
  totalTrips: { type: Number, default: 0 },

  bankAccount: {
    accountHolder: String,     // Titular de la cuenta
    bankName: String,          // Banco
    accountNumber: String,     // Número de cuenta (o CBU/CVU)
    alias: String,             // Alias (opcional)
    identification: String,    // CUIT/DNI del titular
  },
  balance: { type: Number, default: 0 },      // Saldo actual (positivo = empresa le debe, negativo = conductor debe)
  suspended: { type: Boolean, default: false },
  suspensionReason: { type: String, default: '' },
  busy: { type: Boolean, default: false },       // true = actualmente en un viaje (aceptado/started)
  currentRideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', default: null },
});

driverSchema.index({ currentLocation: '2dsphere' });

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;