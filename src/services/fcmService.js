import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const serviceAccountPath = '../../etc/secrets/firebase-service-account.json';
// Ajusta esta ruta según dónde hayas guardado tu archivo JSON de credenciales
const serviceAccount = join(__dirname, serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * Envía una notificación push a un dispositivo específico.
 * @param {string} fcmToken - El token de registro del dispositivo.
 * @param {string} title - Título de la notificación.
 * @param {string} body - Cuerpo del mensaje.
 * @param {object} data - Datos adicionales a enviar (opcional).
 */
export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) {
    console.warn('Intento de enviar notificación sin FCM token.');
    return;
  }

  const message = {
    notification: { title, body },
    data: data,
    token: fcmToken,
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notificación enviada exitosamente:', response);
    return response;
  } catch (error) {
    console.error('Error al enviar la notificación push:', error);
    throw error;
  }
};
