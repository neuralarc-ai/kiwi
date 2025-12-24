import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getMonthlyPerformance,
  createOrUpdatePerformance,
  deletePerformance,
} from '../controllers/performance.controller.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Log route registration
console.log('📊 Performance routes registered:');
console.log('   - GET /api/performance/monthly');
console.log('   - POST /api/performance');
console.log('   - DELETE /api/performance/:id');

router.get('/monthly', getMonthlyPerformance);
router.post('/', authorize('admin', 'hr_executive'), createOrUpdatePerformance);
router.delete('/:id', authorize('admin', 'hr_executive'), deletePerformance);

export default router;

