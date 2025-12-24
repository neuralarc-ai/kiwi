import express from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadPhoto,
} from '../controllers/employee.controller.js';

const router = express.Router();

// Configure multer for file uploads (using memory storage for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Get all employees
router.get('/', getEmployees);

// Get single employee
router.get('/:id', getEmployee);

// Create employee (Admin and HR Executive)
router.post('/', authorize('admin', 'hr_executive'), createEmployee);

// Update employee (Admin and HR Executive)
router.put('/:id', authorize('admin', 'hr_executive'), updateEmployee);

// Delete employee (Admin only)
router.delete('/:id', authorize('admin'), deleteEmployee);

// Upload profile photo
router.post('/:id/photo', authorize('admin', 'hr_executive'), upload.single('photo'), uploadPhoto);

export default router;



