import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Driver from '../models/Driver.js';

// Generar JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '30d' });
};

// @desc    Registrar usuario
// @route   POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, vehicle } = req.body;

    // Verificar si el usuario ya existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Crear usuario
    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'customer',
    });

    // Si es conductor, crear registro en Driver
    if (role === 'driver') {
      await Driver.create({
        user: user._id,
        vehicle: vehicle || {},
        licenseNumber: req.body.licenseNumber,
      });
    }

    // Respuesta con token
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// @desc    Login de usuario
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// @desc    Obtener perfil del usuario autenticado
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let driverData = null;
    if (user.role === 'driver') {
      driverData = await Driver.findOne({ user: user._id });
    }
    res.json({ user, driver: driverData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};