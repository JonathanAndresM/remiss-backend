import express from 'express';
import { updateFcmToken } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/fcm-token', protect, updateFcmToken);

export default router;