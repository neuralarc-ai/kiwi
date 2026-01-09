import { pool } from '../config/database.js';
import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';
import { processDocumentOCR } from '../utils/ocr.js';
import { verifyDocuments } from '../utils/documentVerification.js';

export const getEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM employees ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to generate employee ID
const generateEmployeeId = async () => {
  // Get all existing employee IDs that match the EMP pattern
  const result = await pool.query(
    "SELECT employee_id FROM employees WHERE employee_id LIKE 'EMP%' ORDER BY employee_id DESC"
  );
  
  if (result.rows.length === 0) {
    return 'EMP0001';
  }
  
  // Extract the numeric part from all employee IDs and find the maximum
  let maxNumber = 0;
  for (const row of result.rows) {
    const match = row.employee_id.match(/^EMP(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  // Find the next available ID by checking if it exists
  let nextNumber = maxNumber + 1;
  let attempts = 0;
  const maxAttempts = 1000; // Safety limit
  
  while (attempts < maxAttempts) {
    const candidateId = `EMP${String(nextNumber).padStart(4, '0')}`;
    
    // Check if this ID already exists
    const checkResult = await pool.query(
      'SELECT employee_id FROM employees WHERE employee_id = $1',
      [candidateId]
    );
    
    if (checkResult.rows.length === 0) {
      // This ID is available
      return candidateId;
    }
    
    // ID exists, try next number
    nextNumber++;
    attempts++;
  }
  
  // Fallback: if we somehow can't find an ID, use timestamp-based
  return `EMP${Date.now().toString().slice(-4)}`;
};

export const createEmployee = async (req, res) => {
  try {
    console.log('📝 Create employee request received:', {
      body: req.body,
      user: req.user
    });
    
    const {
      employee_id,
      first_name,
      last_name,
      email,
      phone,
      department,
      position,
      hire_date,
      salary,
      address,
      status,
      employee_type,
      emergency_contact_relation,
      emergency_contact,
      bank_name,
      bank_account_no,
      bank_ifsc,
      bank_account_holder_name,
    } = req.body;

    console.log('📝 Extracted employee data:', {
      first_name,
      last_name,
      email,
      phone,
      department,
      position,
      hire_date,
      salary,
      employee_type
    });

    // Validate required fields
    if (!first_name || !last_name || !email) {
      console.error('❌ Missing required fields:', { first_name, last_name, email });
      return res.status(400).json({ message: 'First name, last name, and email are required' });
    }

    // Generate employee_id if not provided, or if provided one already exists
    let finalEmployeeId = employee_id;
    
    if (!finalEmployeeId) {
      // No ID provided, generate one
      finalEmployeeId = await generateEmployeeId();
    } else {
      // ID provided, check if it exists
      const existingId = await pool.query(
        'SELECT * FROM employees WHERE employee_id = $1',
        [finalEmployeeId]
      );

      if (existingId.rows.length > 0) {
        // Provided ID exists, auto-generate a new one instead of erroring
        console.log(`⚠️ Employee ID "${finalEmployeeId}" already exists. Auto-generating new ID.`);
        finalEmployeeId = await generateEmployeeId();
      }
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      'SELECT * FROM employees WHERE email = $1',
      [email]
    );

    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ 
        message: `Email "${email}" is already registered to another employee. Please use a different email address.` 
      });
    }

    console.log('💾 Inserting employee into database:', {
      employee_id: finalEmployeeId,
      email,
      first_name,
      last_name
    });

    const result = await pool.query(
      `INSERT INTO employees (
        employee_id, first_name, last_name, email, phone, department, 
        position, hire_date, salary, address, status, employee_type,
        emergency_contact_relation, emergency_contact,
        bank_name, bank_account_no, bank_ifsc, bank_account_holder_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
      RETURNING *`,
      [
        finalEmployeeId, 
        first_name, 
        last_name, 
        email, 
        phone || null, 
        department || null, 
        position || null, 
        hire_date || null, 
        salary ? parseFloat(salary) : null, 
        address || null, 
        status || 'active', 
        employee_type || 'Employee',
        emergency_contact_relation || null,
        emergency_contact || null,
        bank_name || null,
        bank_account_no || null,
        bank_ifsc || null,
        bank_account_holder_name || null
      ]
    );

    console.log('✅ Employee created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Create employee error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack
    });
    
    // Return more specific error messages
    if (error.code === '23505') {
      return res.status(400).json({ 
        message: 'An employee with this email or employee ID already exists',
        error: error.detail || error.message
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({ 
        message: 'Invalid reference: One of the provided values does not exist',
        error: error.detail || error.message
      });
    }
    
    if (error.code === '23514') {
      return res.status(400).json({ 
        message: 'Data validation failed: ' + (error.detail || error.message),
        error: error.detail || error.message
      });
    }
    
    res.status(500).json({ 
      message: 'Server error: ' + (error.message || 'Failed to create employee'),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      department,
      position,
      hire_date,
      salary,
      address,
      status,
      employee_type,
      emergency_contact_relation,
      emergency_contact,
      bank_name,
      bank_account_no,
      bank_ifsc,
      bank_account_holder_name,
    } = req.body;

    // Check if employee exists
    const existing = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existing.rows[0].email) {
      const emailCheck = await pool.query('SELECT * FROM employees WHERE email = $1 AND id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const result = await pool.query(
      `UPDATE employees SET 
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        department = COALESCE($5, department),
        position = COALESCE($6, position),
        hire_date = COALESCE($7, hire_date),
        salary = COALESCE($8, salary),
        address = COALESCE($9, address),
        status = COALESCE($10, status),
        employee_type = COALESCE($11, employee_type),
        emergency_contact_relation = COALESCE($12, emergency_contact_relation),
        emergency_contact = COALESCE($13, emergency_contact),
        bank_name = COALESCE($14, bank_name),
        bank_account_no = COALESCE($15, bank_account_no),
        bank_ifsc = COALESCE($16, bank_ifsc),
        bank_account_holder_name = COALESCE($17, bank_account_holder_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $18 
      RETURNING *`,
      [first_name, last_name, email, phone, department, position, hire_date, salary, address, status, employee_type, emergency_contact_relation, emergency_contact, bank_name, bank_account_no, bank_ifsc, bank_account_holder_name, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM employees WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'hr-management/profiles',
        public_id: `employee_${id}`,
        overwrite: true,
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ message: 'Failed to upload image' });
        }

        // Update employee profile photo URL
        const updateResult = await pool.query(
          'UPDATE employees SET profile_photo = $1 WHERE id = $2 RETURNING *',
          [result.secure_url, id]
        );

        res.json({
          message: 'Photo uploaded successfully',
          employee: updateResult.rows[0],
        });
      }
    );

    // Convert buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to upload document to Cloudinary
const uploadDocument = async (file, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        overwrite: true,
        resource_type: 'auto', // Allow PDFs and images
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

export const uploadBankDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Process OCR to extract bank details
    console.log('🔍 Processing OCR for bank details...');
    const ocrResult = await processDocumentOCR(req.file.buffer, 'bank_details', req.file.mimetype);

    // Upload to Cloudinary
    const documentUrl = await uploadDocument(
      req.file,
      'hr-management/documents/bank-details',
      `employee_${id}_bank_details`
    );

    // Update employee with bank details URL and extracted data
    const updateResult = await pool.query(
      `UPDATE employees 
       SET bank_details_url = $1, 
           bank_account_no = $2, 
           bank_name = $3, 
           bank_ifsc = $4, 
           bank_verified = $5,
           bank_account_holder_name = $6
       WHERE id = $7 
       RETURNING *`,
      [
        documentUrl,
        ocrResult.extractedData.accountNumber || null,
        ocrResult.extractedData.bankName || null,
        ocrResult.extractedData.ifscCode || null,
        ocrResult.verified || false,
        ocrResult.extractedData.accountHolderName || null,
        id
      ]
    );

    // Perform comprehensive verification
    await performDocumentVerification(id);

    const finalEmployee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);

    res.json({
      message: 'Bank details uploaded successfully',
      employee: finalEmployee.rows[0],
      ocrResult: {
        verified: ocrResult.verified,
        extractedData: ocrResult.extractedData
      }
    });
  } catch (error) {
    console.error('Upload bank details error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const uploadPanCard = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Process OCR to extract PAN number
    console.log('🔍 Processing OCR for PAN card...');
    const ocrResult = await processDocumentOCR(req.file.buffer, 'pan_card', req.file.mimetype);

    // Upload to Cloudinary
    const documentUrl = await uploadDocument(
      req.file,
      'hr-management/documents/pan-card',
      `employee_${id}_pan_card`
    );

    // Update employee with PAN card URL and extracted data
    const updateResult = await pool.query(
      `UPDATE employees 
       SET pan_card_url = $1, 
           pan_number = $2, 
           pan_verified = $3,
           pan_name = $4,
           pan_dob = $5
       WHERE id = $6 
       RETURNING *`,
      [
        documentUrl,
        ocrResult.extractedData.panNumber || null,
        ocrResult.verified || false,
        ocrResult.extractedData.name || null,
        ocrResult.extractedData.dob || null,
        id
      ]
    );

    // Perform comprehensive verification
    await performDocumentVerification(id);

    const finalEmployee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);

    res.json({
      message: 'PAN card uploaded successfully',
      employee: finalEmployee.rows[0],
      ocrResult: {
        verified: ocrResult.verified,
        extractedData: ocrResult.extractedData
      }
    });
  } catch (error) {
    console.error('Upload PAN card error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const uploadAadharCard = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Process OCR to extract Aadhar number
    console.log('🔍 Processing OCR for Aadhar card...');
    const ocrResult = await processDocumentOCR(req.file.buffer, 'aadhar_card', req.file.mimetype);

    // Upload to Cloudinary
    const documentUrl = await uploadDocument(
      req.file,
      'hr-management/documents/aadhar-card',
      `employee_${id}_aadhar_card`
    );

    // Update employee with Aadhar card URL and extracted data
    const updateResult = await pool.query(
      `UPDATE employees 
       SET aadhar_card_url = $1, 
           aadhar_number = $2, 
           aadhar_verified = $3,
           aadhar_name = $4,
           aadhar_dob = $5
       WHERE id = $6 
       RETURNING *`,
      [
        documentUrl,
        ocrResult.extractedData.aadharNumber || null,
        ocrResult.verified || false,
        ocrResult.extractedData.name || null,
        ocrResult.extractedData.dob || null,
        id
      ]
    );

    // Perform comprehensive verification
    await performDocumentVerification(id);

    const finalEmployee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);

    res.json({
      message: 'Aadhar card uploaded successfully',
      employee: finalEmployee.rows[0],
      ocrResult: {
        verified: ocrResult.verified,
        extractedData: ocrResult.extractedData
      }
    });
  } catch (error) {
    console.error('Upload Aadhar card error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verification-only endpoints (no employee ID required)
export const verifyBankDetails = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('🔍 Verifying bank details (no save)...');
    const ocrResult = await processDocumentOCR(req.file.buffer, 'bank_details', req.file.mimetype);

    res.json({
      verified: ocrResult.verified,
      extractedData: ocrResult.extractedData
    });
  } catch (error) {
    console.error('Verify bank details error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const verifyPanCard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log('🔍 Verifying PAN card (no save)...');
    console.log('📄 File details:', {
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    });

    // Check if file is PDF (not supported yet)
    if (req.file.mimetype === 'application/pdf') {
      return res.status(400).json({ 
        message: 'PDF files are not supported yet. Please upload an image file (JPG, PNG, etc.)',
        verified: false,
        extractedData: {}
      });
    }

    const ocrResult = await processDocumentOCR(req.file.buffer, 'pan_card', req.file.mimetype);

    // If OCR returned an error, handle it gracefully
    if (ocrResult.error) {
      console.error('❌ OCR returned error:', ocrResult.error);
      return res.status(500).json({ 
        message: 'OCR processing failed: ' + ocrResult.error,
        verified: false,
        extractedData: ocrResult.extractedData || {}
      });
    }

    console.log('✅ PAN verification complete:', {
      verified: ocrResult.verified,
      hasNumber: !!ocrResult.extractedData?.panNumber,
      hasName: !!ocrResult.extractedData?.name,
      hasDOB: !!ocrResult.extractedData?.dob
    });

    res.json({
      verified: ocrResult.verified,
      extractedData: ocrResult.extractedData || {}
    });
  } catch (error) {
    console.error('❌ Verify PAN card error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error: ' + (error.message || 'Unknown error'),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      verified: false,
      extractedData: {}
    });
  }
};

export const verifyAadharCard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(200).json({ 
        verified: false,
        extractedData: {},
        error: 'No file uploaded'
      });
    }

    console.log('🔍 Verifying Aadhar card (no save)...');
    console.log('📄 File details:', {
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    });

    // Check if file is PDF (not supported yet)
    if (req.file.mimetype === 'application/pdf') {
      return res.status(200).json({ 
        verified: false,
        extractedData: {},
        error: 'PDF files are not supported yet. Please upload an image file (JPG, PNG, etc.)'
      });
    }

    // Validate file buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(200).json({ 
        verified: false,
        extractedData: {},
        error: 'Empty file uploaded'
      });
    }

    let ocrResult;
    try {
      ocrResult = await processDocumentOCR(req.file.buffer, 'aadhar_card', req.file.mimetype);
    } catch (ocrError) {
      console.error('❌ OCR processing threw error:', ocrError);
      console.error('❌ OCR error stack:', ocrError.stack);
      // Return a result object even if OCR failed
      ocrResult = {
        verified: false,
        extractedData: {},
        error: ocrError.message || 'OCR processing failed'
      };
    }

    // Extract Aadhaar number and name for verification
    const aadharNumber = ocrResult.extractedData?.aadharNumber || null;
    const aadharName = ocrResult.extractedData?.name || null;
    
    // Consider verified if we have the Aadhaar number
    const isVerified = !!(aadharNumber && aadharNumber.length === 12);

    console.log('✅ Aadhar verification complete:', {
      verified: isVerified,
      hasNumber: !!aadharNumber,
      hasName: !!aadharName,
      number: aadharNumber,
      name: aadharName
    });

    // Always return 200 with extracted data
    return res.status(200).json({
      verified: isVerified,
      extractedData: {
        aadharNumber: aadharNumber,
        name: aadharName,
        dob: ocrResult.extractedData?.dob || null
      },
      ...(ocrResult.error && { warning: ocrResult.error })
    });
  } catch (error) {
    console.error('❌ Verify Aadhar card error:', error);
    console.error('❌ Error stack:', error.stack);
    // Always return 200, even on error, so frontend can handle it gracefully
    return res.status(200).json({ 
      verified: false,
      extractedData: {},
      error: error.message || 'Unknown error occurred'
    });
  }
};

// Helper function to perform comprehensive document verification
const performDocumentVerification = async (employeeId) => {
  try {
    // Get employee data with all document information
    const employeeResult = await pool.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
    
    if (employeeResult.rows.length === 0) {
      return;
    }

    const employee = employeeResult.rows[0];

    // Prepare document data
    const panData = employee.pan_number ? {
      panNumber: employee.pan_number,
      name: employee.pan_name,
      dob: employee.pan_dob
    } : null;

    const aadhaarData = employee.aadhar_number ? {
      aadharNumber: employee.aadhar_number,
      name: employee.aadhar_name,
      dob: employee.aadhar_dob
    } : null;

    const bankData = employee.bank_account_no ? {
      accountNumber: employee.bank_account_no,
      bankName: employee.bank_name,
      ifscCode: employee.bank_ifsc,
      accountHolderName: employee.bank_account_holder_name
    } : null;

    // Perform verification
    const verification = verifyDocuments(employee, panData, aadhaarData, bankData);

    // Update employee with verification results
    await pool.query(
      `UPDATE employees 
       SET verification_score = $1,
           verification_status = $2,
           verification_flags = $3
       WHERE id = $4`,
      [
        verification.score,
        verification.verificationStatus,
        JSON.stringify(verification.flags),
        employeeId
      ]
    );

    console.log(`✅ Document verification completed for employee ${employeeId}. Score: ${verification.score}%, Status: ${verification.verificationStatus}`);
  } catch (error) {
    console.error('Document verification error:', error);
  }
};

// HR Approval endpoint
export const approveEmployeeDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // From auth middleware

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update HR approval
    const updateResult = await pool.query(
      `UPDATE employees 
       SET hr_approved = TRUE,
           hr_approved_by = $1,
           hr_approved_at = CURRENT_TIMESTAMP
       WHERE id = $2 
       RETURNING *`,
      [userId, id]
    );

    res.json({
      message: 'Employee documents approved by HR',
      employee: updateResult.rows[0]
    });
  } catch (error) {
    console.error('HR approval error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject employee documents
export const rejectEmployeeDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Update verification status to rejected
    const updateResult = await pool.query(
      `UPDATE employees 
       SET verification_status = 'rejected',
           hr_approved = FALSE,
           hr_approved_by = $1,
           hr_approved_at = CURRENT_TIMESTAMP,
           verification_flags = COALESCE(verification_flags, '[]'::jsonb) || $2::jsonb
       WHERE id = $3 
       RETURNING *`,
      [
        userId,
        JSON.stringify([{ type: 'hr_rejection', severity: 'high', message: reason || 'Documents rejected by HR', timestamp: new Date().toISOString() }]),
        id
      ]
    );

    res.json({
      message: 'Employee documents rejected',
      employee: updateResult.rows[0]
    });
  } catch (error) {
    console.error('HR rejection error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

