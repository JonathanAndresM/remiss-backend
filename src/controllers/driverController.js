import Driver from '../models/Driver.js';
import User from '../models/User.js';
import Ride from '../models/Ride.js';

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

// Obtener balance y detalles del conductor autenticado
export const getDriverBalance = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id }).populate('user', 'name email');
    if (!driver) return res.status(404).json({ message: 'Perfil no encontrado' });
    res.json({
      balance: driver.balance,
      suspended: driver.suspended,
      suspensionReason: driver.suspensionReason,
      bankAccount: driver.bankAccount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar datos bancarios
export const updateBankAccount = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return res.status(404).json({ message: 'Perfil no encontrado' });
    const { accountHolder, bankName, accountNumber, alias, identification } = req.body;
    driver.bankAccount = { accountHolder, bankName, accountNumber, alias, identification };
    await driver.save();
    res.json({ message: 'Cuenta bancaria actualizada', bankAccount: driver.bankAccount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Historial de viajes del conductor
export const getDriverRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driver: req.user._id })
      .populate('customer', 'name')
      .sort({ completedAt: -1 });
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};