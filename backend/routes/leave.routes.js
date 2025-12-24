import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  applyLeave,
  getLeaves,
  getLeave,
  approveLeave,
  rejectLeave,
  getEmployeeLeaves,
} from '../controllers/leave.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Apply for leave (all authenticated users)
router.post('/', applyLeave);

// Get all leaves (Admin and HR Executive can see all, others see only their own)
router.get('/', getLeaves);

// Get single leave
router.get('/:id', getLeave);

// Get employee leaves
router.get('/employee/:employeeId', getEmployeeLeaves);

// Approve leave (Admin only)
router.put('/:id/approve', authorize('admin'), approveLeave);

// Reject leave (Admin only)
router.put('/:id/reject', authorize('admin'), rejectLeave);

export default router;



