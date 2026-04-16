import { createMercadoPagoPayment } from '../config/mercadopago.js';

// Simulación de verificación de saldo
export const checkBalance = async (req, res) => {
  try {
    const { amount } = req.body;
    const hasSufficientBalance = amount < 10000; // simulación
    res.json({ hasSufficientBalance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear pago real
export const createPayment = async (req, res) => {
  try {
    const { amount, description, payerEmail } = req.body;
    const paymentResult = await createMercadoPagoPayment({ amount, description, payerEmail });
    if (paymentResult.status === 'approved') {
      return res.json({ status: 'approved', id: paymentResult.id });
    } else {
      return res.status(400).json({ status: paymentResult.status, message: 'Pago rechazado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};