import mongoose from 'mongoose';

const weeklySettlementSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  startDate: { type: Date, required: true },   // Lunes 00:00
  endDate: { type: Date, required: true },     // Domingo 23:59
  totalCash: { type: Number, default: 0 },      // Suma de precios de viajes en efectivo
  totalDigital: { type: Number, default: 0 },   // Suma de precios de viajes digitales
  totalCompanyCommission: { type: Number, default: 0 },  // 15% de totalCash + 15% de totalDigital (pero el conductor ya pagó en efectivo)
  driverNet: { type: Number, default: 0 },       // Lo que la empresa le debe al conductor (positivo) o viceversa (negativo)
  settlementStatus: { type: String, enum: ['pending', 'paid', 'debt'], default: 'pending' },
  paymentDate: { type: Date },                   // Fecha en que se realizó el depósito o cobro
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('WeeklySettlement', weeklySettlementSchema);