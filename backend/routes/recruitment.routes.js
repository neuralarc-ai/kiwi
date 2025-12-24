import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getJobPostings,
  getJobPosting,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  updateApplicationCount,
} from '../controllers/recruitment.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getJobPostings);
router.get('/:id', getJobPosting);
router.post('/', authorize('admin', 'hr_executive'), createJobPosting);
router.put('/:id', authorize('admin', 'hr_executive'), updateJobPosting);
router.delete('/:id', authorize('admin'), deleteJobPosting);
router.put('/:id/applications', updateApplicationCount);

export default router;



