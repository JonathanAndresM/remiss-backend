import express from 'express';
import {
  requestRide,
  getRideById,
  cancelRide,
  acceptRide,
  startRide,
  completeRide,
  estimatePrice,
  markArrival,
  completeRideWithPin,
  resendPinCode,
  cancelRideDueToWait,
} from '../controllers/rideController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Rutas públicas (solo autenticación, sin roles específicos)
router.post('/', protect, requestRide);
router.post('/estimate', protect, estimatePrice);
router.get('/:id', protect, getRideById);
router.put('/:id/cancel', protect, cancelRide);
router.post('/:id/resend-pin', protect, authorize('customer'), resendPinCode);

// Rutas exclusivas para conductores
router.put('/:id/accept', protect, authorize('driver'), acceptRide);
router.put('/:id/start', protect, authorize('driver'), startRide);
router.put('/:id/arrival', protect, authorize('driver'), markArrival);
router.put('/:id/complete-with-pin', protect, authorize('driver'), completeRideWithPin);
router.put('/:id/complete', protect, authorize('driver'), completeRide); // Opcional: si mantienes la versión sin PIN
router.put('/:id/cancel-by-wait', protect, authorize('driver'), cancelRideDueToWait);

export default router;