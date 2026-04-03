import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import createHash from '../middleware/createHash.js';

const router = express.Router();

router.post('/register', createHash, register);
router.post('/login', login);
router.get('/me', protect, getMe);

export default router;