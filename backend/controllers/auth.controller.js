import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database.js';
import { validatePassword } from '../utils/passwordValidator.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const register = async (req, res) => {
  try {
    const { email, password, role, first_name, last_name, phone, department, position, address } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    // Normalize role to lowercase
    const normalizedRole = role?.toLowerCase().trim();

    if (!['admin', 'hr_executive', 'employee'].includes(normalizedRole)) {
      console.error('Invalid role in register endpoint:', { role, normalizedRole });
      return res.status(400).json({ 
        message: `Invalid role: "${role}". Allowed roles: admin, hr_executive, employee` 
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Password validation failed',
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    let result;
    try {
      result = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [email, hashedPassword, normalizedRole]
      );
    } catch (dbError) {
      console.error('Database error creating user:', dbError);
      if (dbError.code === '23514') {
        return res.status(400).json({ 
          message: `Invalid role: "${normalizedRole}". Database constraint violation. Please contact administrator.` 
        });
      }
      throw dbError;
    }

    const user = result.rows[0];

    // If employee role, create employee record
    let employee = null;
    if (normalizedRole === 'employee') {
      // Validate required fields for employee
      if (!first_name || !last_name) {
        // Delete the user if employee creation fails
        await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
        return res.status(400).json({ message: 'First name and last name are required for employee registration' });
      }
      
      try {
        employee = await createEmployeeRecord(user, {
          first_name,
          last_name,
          phone,
          department,
          position,
          address,
        });
      } catch (empError) {
        // If employee creation fails, delete the user
        await pool.query('DELETE FROM users WHERE id = $1', [user.id]);
        throw empError;
      }
    }

    res.status(201).json({
      message: 'User created successfully',
      user,
      employee,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to generate employee ID
const generateEmployeeId = async () => {
  const result = await pool.query('SELECT COUNT(*) FROM employees');
  const count = parseInt(result.rows[0].count);
  return `EMP${String(count + 1).padStart(4, '0')}`;
};

// Helper function to create employee record
const createEmployeeRecord = async (userData, employeeData) => {
  const {
    first_name,
    last_name,
    phone,
    department,
    position,
    address,
  } = employeeData;

  // Generate employee ID
  const employee_id = await generateEmployeeId();

  // Create employee record
  const employeeResult = await pool.query(
    `INSERT INTO employees (
      employee_id, first_name, last_name, email, phone, 
      department, position, address, status, hire_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE) 
    RETURNING *`,
    [
      employee_id,
      first_name || userData.email.split('@')[0],
      last_name || '',
      userData.email,
      phone || null,
      department || null,
      position || null,
      address || null,
      'active',
    ]
  );

  return employeeResult.rows[0];
};

// Register HR Executive user (no auth required) - Only HR Executives can self-register
// Admin accounts must be created separately via script or manually
export const registerFirstUser = async (req, res) => {
  try {
    console.log('📝 Register Admin/HR user request received:', { 
      email: req.body?.email, 
      role: req.body?.role,
      hasPassword: !!req.body?.password 
    });

    const { email, password, role } = req.body;

    if (!email || !password) {
      console.error('❌ Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // ✅ Block admin registration - only HR Executives can register
    // Admin accounts must be created separately (via script or manually)
    let userRole = role || 'hr_executive';
    userRole = userRole?.toLowerCase().trim();
    
    // ✅ Block admin registration completely
    if (userRole === 'admin') {
      return res.status(403).json({ 
        message: 'Admin accounts cannot be created through registration. Admin accounts must be created by a system administrator. Please contact your system administrator or use the admin creation script.' 
      });
    }
    
    // Employees cannot be created via self-registration
    if (userRole === 'employee') {
      return res.status(403).json({ 
        message: 'Employees cannot self-register. Please contact an administrator to create your account.' 
      });
    }

    // ✅ Only allow HR Executive registration
    if (userRole !== 'hr_executive') {
      return res.status(400).json({ 
        message: `Invalid role: "${role}". Only HR Executive can register through this endpoint.` 
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: 'Password validation failed',
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    console.log(`💾 Inserting user into database: ${email} with role: ${userRole}`);
    let result;
    try {
      result = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        [email, hashedPassword, userRole]
      );
      console.log('✅ User inserted successfully:', result.rows[0]);
    } catch (dbError) {
      console.error('❌ Database error creating user:', {
        code: dbError.code,
        message: dbError.message,
        detail: dbError.detail,
        constraint: dbError.constraint
      });
      if (dbError.code === '23514') {
        return res.status(400).json({ 
          message: `Invalid role: "${userRole}". Database constraint violation. Please contact administrator.` 
        });
      }
      if (dbError.code === '23505') {
        return res.status(400).json({ 
          message: 'Email already exists. Please use a different email.' 
        });
      }
      throw dbError;
    }

    const user = result.rows[0];

    // Generate JWT token for automatic login
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'b127e4004408c1a8a1df26d15d9e7be3',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Log the activity
    try {
      await pool.query(
        'INSERT INTO activities (type, description, user_id) VALUES ($1, $2, $3)',
        ['user_registration', `HR Executive registered: ${user.email}`, user.id]
      );
    } catch (activityError) {
      // Don't fail registration if activity logging fails
      console.error('Failed to log activity:', activityError);
    }

    console.log(`✅ HR Executive user created successfully: ${user.email}`);

    // Return user data with token for automatic login
    res.status(201).json({
      message: `HR Executive account created successfully. You are now logged in.`,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register first user error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};


