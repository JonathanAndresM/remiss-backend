import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

/**
 * Envía un mensaje de texto (SMS) a un número de teléfono.
 * @param {string} to - Número de teléfono del destinatario.
 * @param {string} message - Cuerpo del mensaje.
 */
export const sendSMS = async (to, message) => {
  if (!to || !message) {
    console.warn('Faltan parámetros para enviar SMS.');
    return;
  }

  try {
    const sms = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: to,
    });
    console.log(`SMS enviado a ${to}: ${sms.sid}`);
    return sms;
  } catch (error) {
    console.error(`Error al enviar SMS a ${to}:`, error);
    throw error;
  }
};