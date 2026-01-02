import { pool } from '../config/database.js';
import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

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
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
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

    const result = await pool.query(
      `INSERT INTO employees (
        employee_id, first_name, last_name, email, phone, department, 
        position, hire_date, salary, address, status, employee_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [finalEmployeeId, first_name, last_name, email, phone, department, position, hire_date, salary, address, status || 'active', employee_type || 'Employee']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Server error' });
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12 
      RETURNING *`,
      [first_name, last_name, email, phone, department, position, hire_date, salary, address, status, employee_type, id]
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

