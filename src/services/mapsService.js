import { Client } from '@googlemaps/google-maps-services-js';

// Inicializamos el cliente de Google Maps
const client = new Client({});

/**
 * Calcula la distancia y duración de un viaje entre dos puntos.
 * @param {Object} origin - { lat, lng } o una dirección en texto.
 * @param {Object} destination - { lat, lng } o una dirección en texto.
 * @returns {Promise<{distance: number, duration: number}>} Distancia en km y duración en minutos.
 */
export const getDistanceAndDuration = async (origin, destination) => {
  try {
    const response = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [destination],
        key: process.env.GOOGLE_MAPS_API_KEY,
        // Puedes cambiar el modo de transporte, por defecto es 'driving'
        mode: 'driving',
        // Opcional: para obtener el tiempo con tráfico
        departure_time: 'now',
      },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Error en la API de Google: ${response.data.status}`);
    }

    const element = response.data.rows[0].elements[0];
    if (element.status === 'ZERO_RESULTS') {
      throw new Error('No se pudo calcular la distancia entre los puntos proporcionados');
    }

    // La distancia viene en metros, la convertimos a kilómetros
    const distanceInKm = element.distance.value / 1000;
    // La duración viene en segundos, la convertimos a minutos
    const durationInMinutes = Math.ceil(element.duration.value / 60);

    return { distance: distanceInKm, duration: durationInMinutes };
  } catch (error) {
    console.error('Error al calcular distancia con Google Maps:', error);
    throw new Error('No se pudo calcular la distancia. Verifica las direcciones.');
  }
};