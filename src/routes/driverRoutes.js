import express from 'express';
import { updateLocation, setAvailability, getNearbyDrivers } from '../controllers/driverController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // Todas requieren autenticación
router.post('/location', authorize('driver'), updateLocation);
router.put('/status', authorize('driver'), setAvailability);
router.get('/nearby', authorize('admin', 'customer'), getNearbyDrivers);

export default router;