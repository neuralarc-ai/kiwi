import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getSettings,
  getSetting,
  updateSettings,
  updateSetting,
} from '../controllers/settings.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getSettings);
router.get('/:key', getSetting);
router.put('/', authorize('admin', 'hr'), updateSettings);
router.put('/:key', authorize('admin', 'hr'), updateSetting);

export default router;

