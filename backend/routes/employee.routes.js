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
  uploadBankDetails,
  uploadPanCard,
  uploadAadharCard,
  verifyBankDetails,
  verifyPanCard,
  verifyAadharCard,
  approveEmployeeDocuments,
  rejectEmployeeDocuments,
} from '../controllers/employee.controller.js';

const router = express.Router();

// Configure multer for file uploads (using memory storage for Cloudinary)
const storage = multer.memoryStorage();

// For profile photos (images only)
const uploadImage = multer({
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

// For documents (PDFs and images)
const uploadDocument = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: (req, file, cb) => {
    // Allow PDFs and images
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Get all employees
router.get('/', getEmployees);

// Verification-only endpoints (no employee ID required, no save) - MUST come before /:id routes
router.post('/verify/bank-details', uploadDocument.single('bank_details'), verifyBankDetails);
router.post('/verify/pan-card', uploadDocument.single('pan_card'), verifyPanCard);
router.post('/verify/aadhar-card', uploadDocument.single('aadhar_card'), verifyAadharCard);

// Get single employee
router.get('/:id', getEmployee);

// Create employee (Admin and HR Executive)
router.post('/', authorize('admin', 'hr_executive'), createEmployee);

// Update employee (Admin and HR Executive)
router.put('/:id', authorize('admin', 'hr_executive'), updateEmployee);

// Delete employee (Admin only)
router.delete('/:id', authorize('admin'), deleteEmployee);

// Upload profile photo
router.post('/:id/photo', authorize('admin', 'hr_executive'), uploadImage.single('photo'), uploadPhoto);

// Upload bank details
router.post('/:id/bank-details', authorize('admin', 'hr_executive'), uploadDocument.single('bank_details'), uploadBankDetails);

// Upload PAN card
router.post('/:id/pan-card', authorize('admin', 'hr_executive'), uploadDocument.single('pan_card'), uploadPanCard);

// Upload Aadhar card
router.post('/:id/aadhar-card', authorize('admin', 'hr_executive'), uploadDocument.single('aadhar_card'), uploadAadharCard);

// HR Approval endpoints
router.post('/:id/approve-documents', authorize('admin', 'hr_executive'), approveEmployeeDocuments);
router.post('/:id/reject-documents', authorize('admin', 'hr_executive'), rejectEmployeeDocuments);

export default router;



