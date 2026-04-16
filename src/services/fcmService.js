import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determinar la ruta del archivo de credenciales según el entorno
let serviceAccountPath;
if (process.env.NODE_ENV === 'production') {
  // En producción (Render), los secret files se montan en /etc/secrets/
  serviceAccountPath = '/etc/secrets/firebase-service-account.json';
} else {
  // En desarrollo local, buscar en config/ dentro del proyecto
  serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');
}

// Verificar si el archivo existe antes de inicializar
if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin inicializado correctamente');
    }
  } catch (error) {
    console.error('❌ Error al parsear el archivo de credenciales de Firebase:', error);
  }
} else {
  console.warn(`⚠️ Archivo de credenciales de Firebase no encontrado en: ${serviceAccountPath}`);
  console.warn('Las notificaciones push no estarán disponibles.');
}

// Función para enviar notificaciones (segura, no falla si no hay admin)
export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!admin.apps.length) {
    console.warn('Firebase no inicializado. No se envió notificación.');
    return;
  }
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
    console.log('✅ Notificación enviada:', response);
    return response;
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
    throw error;
  }
};
