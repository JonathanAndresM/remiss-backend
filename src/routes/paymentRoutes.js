import express from 'express';
import { checkBalance, createPayment } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/check-balance', protect, checkBalance);
router.post('/create', protect, createPayment);

export default router;