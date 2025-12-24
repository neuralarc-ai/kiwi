import express from 'express';
import { login, register, registerFirstUser } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
// Allow Admin/HR self-registration (no auth required)
router.post('/register-first', registerFirstUser);
// Regular registration (requires admin token) - for creating employees or other users
router.post('/register', authenticate, authorize('admin'), register);

export default router;


