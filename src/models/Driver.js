import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  vehicle: {
    brand: String,
    model: String,
    plate: String,
    color: String,
  },
  licenseNumber: String,
  isAvailable: {
    type: Boolean,
    default: true,
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
  },
  rating: {
    type: Number,
    default: 5,
  },
  totalTrips: {
    type: Number,
    default: 0,
  },
});

// Índice geoespacial para consultas cercanas
driverSchema.index({ currentLocation: '2dsphere' });

const Driver = mongoose.model('Driver', driverSchema);
export default Driver;