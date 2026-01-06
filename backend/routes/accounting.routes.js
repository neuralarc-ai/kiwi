import express from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware.js'
import {
  getAccountingData,
  updateAccountingAmount,
  initializeAccountingEntries,
  createAccountingEntry,
  syncSalaryFromPayroll,
} from '../controllers/accounting.controller.js'

const router = express.Router()

router.use(authenticate)

// Test route to verify accounting routes are loaded
router.get('/test', (req, res) => {
  res.json({ message: 'Accounting routes are working!', timestamp: new Date().toISOString() })
})

// Get accounting data for a month/year
router.get('/', getAccountingData)

// Initialize accounting entries for a month/year
router.post('/initialize', authorize('admin', 'hr_executive'), initializeAccountingEntries)

// Create a new accounting entry
router.post('/', authorize('admin', 'hr_executive'), createAccountingEntry)

// Update accounting amount
router.put('/:id', authorize('admin', 'hr_executive'), updateAccountingAmount)

// Sync salary from payroll
router.get('/sync-salary', authenticate, syncSalaryFromPayroll)

export default router

