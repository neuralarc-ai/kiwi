import express from 'express';
import { login, register, registerFirstUser, getUsers } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
// Public registration - anyone can create an account (no auth required)
router.post('/register', register);
// Allow Admin/HR self-registration (no auth required) - kept for backward compatibility
router.post('/register-first', registerFirstUser);
// Admin registration (requires admin or hr_executive token) - for creating employees or other users
router.post('/register-admin', authenticate, authorize('admin', 'hr_executive'), register);
// Get all users (admin and hr_executive only)
router.get('/users', authenticate, authorize('admin', 'hr_executive'), getUsers);

export default router;


