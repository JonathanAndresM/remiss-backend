import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  origin: {
    address: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
  },
  destination: {
    address: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'started', 'completed', 'cancelled'],
    default: 'requested',
  },
  price: {
    type: Number,
    required: true,
  },
  distance: Number, // en km
  duration: Number, // en minutos
  paymentMethod: {
    type: String,
    enum: ['cash', 'card'],
    default: 'cash',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  startedAt: Date,
  completedAt: Date,
});

// Índice para búsquedas por estado y ubicación
rideSchema.index({ status: 1, 'origin.location': '2dsphere' });

const Ride = mongoose.model('Ride', rideSchema);
export default Ride;