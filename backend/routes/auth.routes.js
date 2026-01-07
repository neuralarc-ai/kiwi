import express from 'express';
import { login, register, registerFirstUser, getUsers } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Log route initialization
console.log('🔓 Auth routes initialized');
console.log('🔒 /register route is PROTECTED - requires admin/hr_executive authentication');

router.post('/login', login);

// Registration is now ADMIN ONLY - users must be created by admin through settings
// This route requires admin or hr_executive authentication
router.post('/register', authenticate, authorize('admin', 'hr_executive'), register);

// Allow Admin/HR self-registration (no auth required) - kept for backward compatibility
// This is for the first admin user setup only
router.post('/register-first', registerFirstUser);

// Get all users (admin and hr_executive only)
router.get('/users', authenticate, authorize('admin', 'hr_executive'), getUsers);

export default router;


