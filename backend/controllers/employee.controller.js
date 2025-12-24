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
  const result = await pool.query(
    "SELECT COUNT(*) as count FROM employees WHERE employee_id LIKE 'EMP%'"
  );
  const count = parseInt(result.rows[0].count) || 0;
  return `EMP${String(count + 1).padStart(4, '0')}`;
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
    } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return res.status(400).json({ message: 'First name, last name, and email are required' });
    }

    // Generate employee_id if not provided
    let finalEmployeeId = employee_id;
    if (!finalEmployeeId) {
      finalEmployeeId = await generateEmployeeId();
    }

    // Check if employee_id or email already exists
    const existing = await pool.query(
      'SELECT * FROM employees WHERE employee_id = $1 OR email = $2',
      [finalEmployeeId, email]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Employee ID or email already exists' });
    }

    const result = await pool.query(
      `INSERT INTO employees (
        employee_id, first_name, last_name, email, phone, department, 
        position, hire_date, salary, address, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *`,
      [finalEmployeeId, first_name, last_name, email, phone, department, position, hire_date, salary, address, status || 'active']
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 
      RETURNING *`,
      [first_name, last_name, email, phone, department, position, hire_date, salary, address, status, id]
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

