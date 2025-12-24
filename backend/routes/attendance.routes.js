import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  markAttendance,
  getAttendance,
  getDailyAttendance,
  getMonthlyAttendance,
  getEmployeeAttendance,
  getEmployeesWithAttendance,
} from '../controllers/attendance.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Mark attendance (Admin and HR Executive)
router.post('/', authorize('admin', 'hr_executive'), markAttendance);

// Get all employees with attendance status for a date
router.get('/employees', getEmployeesWithAttendance);

// Get attendance by ID
router.get('/:id', getAttendance);

// Get daily attendance
router.get('/daily/:date', getDailyAttendance);

// Get monthly attendance
router.get('/monthly/:year/:month', getMonthlyAttendance);

// Get employee attendance history
router.get('/employee/:employeeId', getEmployeeAttendance);

export default router;



