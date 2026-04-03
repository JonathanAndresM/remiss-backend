import express from 'express';
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRides,
  getRideById,
  updateRideStatus,
  deleteRide,
  getDashboardStats,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol admin
router.use(protect, authorize('admin'));

// Dashboard
router.get('/stats', getDashboardStats);

// Conductores
router.route('/drivers')
  .get(getDrivers)
  .post(createDriver);
router.route('/drivers/:id')
  .get(getDriverById)
  .put(updateDriver)
  .delete(deleteDriver);

// Usuarios
router.route('/users')
  .get(getUsers)
  .post(createUser);
router.route('/users/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

// Viajes
router.route('/rides')
  .get(getRides);
router.route('/rides/:id')
  .get(getRideById)
  .put(updateRideStatus)
  .delete(deleteRide);

export default router;