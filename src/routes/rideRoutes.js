import express from 'express';
import {
  requestRide,
  getRideById,
  cancelRide,
  acceptRide,
  startRide,
  completeRide,
} from '../controllers/rideController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, requestRide);
router.get('/:id', protect, getRideById);
router.put('/:id/cancel', protect, cancelRide);
router.put('/:id/accept', protect, authorize('driver'), acceptRide);
router.put('/:id/start', protect, authorize('driver'), startRide);
router.put('/:id/complete', protect, authorize('driver'), completeRide);

export default router;