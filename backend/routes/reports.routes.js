import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
} from '../controllers/reports.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/employees', getEmployeeReport);
router.get('/attendance', getAttendanceReport);
router.get('/leaves', getLeaveReport);
router.get('/payroll', getPayrollReport);

export default router;

