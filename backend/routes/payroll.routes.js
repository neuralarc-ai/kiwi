import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getPayrolls,
  getPayroll,
  createPayroll,
  processPayroll,
  updatePayroll,
} from '../controllers/payroll.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getPayrolls);
router.get('/:id', getPayroll);
router.post('/', authorize('admin', 'hr_executive'), createPayroll);
router.post('/process', authorize('admin'), processPayroll);
router.put('/:id', authorize('admin', 'hr_executive'), updatePayroll);

export default router;
