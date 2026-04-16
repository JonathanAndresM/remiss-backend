import express from 'express';
import { 
  updateLocation, 
  setAvailability, 
  getNearbyDrivers,
  getDriverBalance,
  updateBankAccount,
  getDriverRides
} from '../controllers/driverController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Todas requieren autenticación
router.post('/location', authorize('driver'), updateLocation);
router.put('/status', authorize('driver'), setAvailability);
router.get('/nearby', authorize('admin', 'customer'), getNearbyDrivers);
router.get('/balance', protect, authorize('driver'), getDriverBalance);
router.put('/bank-account', protect, authorize('driver'), updateBankAccount);
router.get('/rides', protect, authorize('driver'), getDriverRides);

export default router;