import mongoose from 'mongoose';

const balanceTransactionSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
  amount: { type: Number, required: true },      // positivo o negativo
  type: { type: String, enum: ['ride_cash', 'ride_digital', 'adjustment', 'settlement_payment'], required: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('BalanceTransaction', balanceTransactionSchema);