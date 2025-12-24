import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getDashboardStats, getDailyAttendanceStats } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(authenticate);

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  console.log('📊 Dashboard stats route hit - GET /api/dashboard/stats');
  try {
    await getDashboardStats(req, res);
  } catch (error) {
    console.error('❌ Error in dashboard stats route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get daily attendance stats for graph
router.get('/attendance-stats', async (req, res) => {
  try {
    await getDailyAttendanceStats(req, res);
  } catch (error) {
    console.error('❌ Error in attendance stats route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

