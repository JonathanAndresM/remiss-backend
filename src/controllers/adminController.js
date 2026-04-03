import User from '../models/User.js';
import Driver from '../models/Driver.js';
import Ride from '../models/Ride.js';

// Obtener conductores con paginación y filtros
export const getDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isAvailable } = req.query;
    const filter = {};
    if (search) {
      const usersWithName = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id');
      filter.user = { $in: usersWithName.map(u => u._id) };
    }
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    
    const drivers = await Driver.find(filter)
      .populate('user', 'name email phone')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Driver.countDocuments(filter);
    
    res.json({
      drivers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener un conductor por ID
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('user', 'name email phone');
    if (!driver) return res.status(404).json({ message: 'Conductor no encontrado' });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear conductor (crea usuario y perfil de conductor)
export const createDriver = async (req, res) => {
  try {
    const { name, email, password, phone, vehicle, licenseNumber } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email ya registrado' });
    
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'driver',
    });
    
    const driver = await Driver.create({
      user: user._id,
      vehicle,
      licenseNumber,
      isAvailable: false,
    });
    
    const populatedDriver = await driver.populate('user', 'name email phone');
    res.status(201).json(populatedDriver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar conductor
export const updateDriver = async (req, res) => {
  try {
    const { vehicle, licenseNumber, isAvailable } = req.body;
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Conductor no encontrado' });
    
    if (vehicle) driver.vehicle = vehicle;
    if (licenseNumber !== undefined) driver.licenseNumber = licenseNumber;
    if (isAvailable !== undefined) driver.isAvailable = isAvailable;
    await driver.save();
    
    // Actualizar también el usuario si se envía nombre, email, etc.
    if (req.body.name || req.body.email || req.body.phone) {
      const user = await User.findById(driver.user);
      if (req.body.name) user.name = req.body.name;
      if (req.body.email) user.email = req.body.email;
      if (req.body.phone) user.phone = req.body.phone;
      await user.save();
    }
    
    const updatedDriver = await Driver.findById(driver._id).populate('user', 'name email phone');
    res.json(updatedDriver);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar conductor (elimina usuario y perfil)
export const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ message: 'Conductor no encontrado' });
    await User.findByIdAndDelete(driver.user);
    await driver.deleteOne();
    res.json({ message: 'Conductor eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener usuarios (clientes) con paginación y filtros
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter = { role: 'customer' };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    const total = await User.countDocuments(filter);
    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'customer') return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email ya registrado' });
    const user = await User.create({ name, email, password, phone, role: 'customer' });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'customer') return res.status(404).json({ message: 'Usuario no encontrado' });
    const { name, email, phone } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'customer') return res.status(404).json({ message: 'Usuario no encontrado' });
    await user.deleteOne();
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener viajes con paginación, filtros y opciones de ordenamiento
export const getRides = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, fromDate, toDate, driverId, customerId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (fromDate) filter.createdAt = { $gte: new Date(fromDate) };
    if (toDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(toDate) };
    if (driverId) filter.driver = driverId;
    if (customerId) filter.customer = customerId;
    
    const rides = await Ride.find(filter)
      .populate('customer', 'name email')
      .populate('driver', 'name email')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await Ride.countDocuments(filter);
    res.json({
      rides,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('driver', 'name email phone');
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    ride.status = status;
    await ride.save();
    res.json(ride);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Viaje no encontrado' });
    await ride.deleteOne();
    res.json({ message: 'Viaje eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Estadísticas para dashboard
export const getDashboardStats = async (req, res) => {
  try {
    const totalDrivers = await Driver.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalRides = await Ride.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayRides = await Ride.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } });
    
    // Viajes por estado
    const ridesByStatus = await Ride.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    
    // Ingresos totales (suponiendo que los viajes completados tienen precio)
    const totalRevenue = await Ride.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);
    
    res.json({
      totalDrivers,
      totalUsers,
      totalRides,
      todayRides,
      ridesByStatus,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};