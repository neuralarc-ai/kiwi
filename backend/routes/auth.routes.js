import express from 'express';
import { login, register, registerFirstUser, getUsers } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Log route initialization
console.log('🔓 Auth routes initialized');
console.log('🔓 /register route is PUBLIC - NO authentication required');

router.post('/login', login);

// Public registration - anyone can create an account (no auth required)
// IMPORTANT: This route MUST remain public (no authenticate middleware)
// Mobile users and new users need to be able to register without a token
// DO NOT add authenticate middleware to this route
router.post('/register', (req, res, next) => {
  // Explicit logging to verify this route is being hit
  const timestamp = new Date().toISOString();
  console.log('🔓 ==========================================');
  console.log('🔓 PUBLIC /register route handler called');
  console.log('🔓 Timestamp:', timestamp);
  console.log('🔓 Method:', req.method);
  console.log('🔓 Path:', req.path);
  console.log('🔓 URL:', req.url);
  console.log('🔓 Original URL:', req.originalUrl);
  console.log('🔓 Full URL:', req.protocol + '://' + req.get('host') + req.originalUrl);
  console.log('🔓 Has Authorization header:', !!req.headers.authorization);
  console.log('🔓 Authorization header value:', req.headers.authorization ? 'Present (but not required)' : 'Missing (OK for public route)');
  console.log('🔓 Has req.user:', !!req.user);
  console.log('🔓 Request body keys:', Object.keys(req.body || {}));
  console.log('🔓 Request body email:', req.body?.email || 'MISSING');
  console.log('🔓 Request body has password:', !!req.body?.password);
  console.log('🔓 Environment:', process.env.NODE_ENV || 'not set');
  console.log('🔓 ==========================================');
  
  // Verify this is NOT going through authenticate middleware
  if (req.user) {
    console.warn('⚠️ WARNING: req.user is set on public route! This should not happen.');
  }
  
  // Call the register controller
  register(req, res, next);
});
// Allow Admin/HR self-registration (no auth required) - kept for backward compatibility
router.post('/register-first', registerFirstUser);
// Admin registration (requires admin or hr_executive token) - for creating employees or other users
router.post('/register-admin', authenticate, authorize('admin', 'hr_executive'), register);
// Get all users (admin and hr_executive only)
router.get('/users', authenticate, authorize('admin', 'hr_executive'), getUsers);

export default router;


