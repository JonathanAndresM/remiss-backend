import Driver from '../models/Driver.js';
import User from '../models/User.js';

// @desc    Actualizar ubicación del conductor
// @route   POST /api/drivers/location
export const updateLocation = async (req, res) => {
  try {
    const { coordinates } = req.body; // [long, lat]
    if (!coordinates || coordinates.length !== 2) {
      return res.status(400).json({ message: 'Coordenadas inválidas' });
    }
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) {
      return res.status(404).json({ message: 'Perfil de conductor no encontrado' });
    }
    driver.currentLocation.coordinates = coordinates;
    await driver.save();

    // Emitir ubicación a través de socket (opcional)
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('driverLocation', {
        driverId: req.user._id,
        coordinates,
      });
    }

    res.json({ message: 'Ubicación actualizada', location: driver.currentLocation });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al actualizar ubicación' });
  }
};

// @desc    Cambiar disponibilidad del conductor
// @route   PUT /api/drivers/status
export const setAvailability = async (req, res) => {
  try {
    const { isAvailable } = req.body;
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) {
      return res.status(404).json({ message: 'Perfil de conductor no encontrado' });
    }
    driver.isAvailable = isAvailable;
    await driver.save();

    // Emitir evento de disponibilidad
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('driverAvailability', {
        driverId: req.user._id,
        isAvailable,
      });
    }

    res.json({ message: `Disponibilidad cambiada a ${isAvailable}`, isAvailable });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al cambiar disponibilidad' });
  }
};

// @desc    Obtener conductores cercanos (para admin o pruebas)
// @route   GET /api/drivers/nearby?lng=X&lat=Y&radius=Z
export const getNearbyDrivers = async (req, res) => {
  try {
    const { lng, lat, radius = 5000 } = req.query; // radius en metros
    if (!lng || !lat) {
      return res.status(400).json({ message: 'Se requieren coordenadas' });
    }
    const drivers = await Driver.find({
      isAvailable: true,
      currentLocation: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
    }).populate('user', 'name phone rating');
    res.json(drivers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener conductores cercanos' });
  }
};