import { MercadoPagoConfig, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
});

export default client;

export const createMercadoPagoPayment = async ({ amount, description, payerEmail }) => {
  const payment = new Payment(client);
  const paymentData = {
    transaction_amount: amount,
    description: description,
    payment_method_id: 'account_money',
    payer: { email: payerEmail },
  };
  const response = await payment.create({ body: paymentData });
  return response;
};