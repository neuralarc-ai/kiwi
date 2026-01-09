import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
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

    // Ensure JWT_SECRET is set, use fallback if not configured
    const jwtSecret = process.env.JWT_SECRET || 'b127e4004408c1a8a1df26d15d9e7be3';
    
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET is not configured!');
      return res.status(500).json({ message: 'Server configuration error: JWT_SECRET not set' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Verify token was generated
    if (!token) {
      console.error('❌ Token generation failed!');
      return res.status(500).json({ message: 'Failed to generate authentication token' });
    }

    console.log('✅ Login successful for user:', user.email);
    console.log('✅ Token generated successfully (length:', token.length, ')');

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // More specific error messages
    if (error.name === 'JsonWebTokenError') {
      return res.status(500).json({ message: 'Token generation failed: Invalid JWT configuration' });
    }
    
    res.status(500).json({ 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const register = async (req, res) => {
  const startTime = Date.now();
  try {
    const timestamp = new Date().toISOString();
    console.log('📥 ==========================================');
    console.log('📥 Register controller called');
    console.log('📥 Timestamp:', timestamp);
    console.log('📥 Request method:', req.method);
    console.log('📥 Request path:', req.path);
    console.log('📥 Request originalUrl:', req.originalUrl);
    console.log('📥 Request body keys:', Object.keys(req.body || {}));
    console.log('📥 Request body email:', req.body?.email || 'MISSING');
    console.log('📥 Request body has password:', !!req.body?.password);
    console.log('📥 Request body role:', req.body?.role || 'not provided');
    console.log('📥 Content-Type:', req.headers['content-type']);
    console.log('📥 Has Authorization header:', !!req.headers.authorization);
    console.log('📥 Authorization header (first 20 chars):', req.headers.authorization?.substring(0, 20) || 'N/A');
    console.log('📥 Has req.user:', !!req.user);
    console.log('📥 req.user:', req.user || 'null (expected for public registration)');
    console.log('📥 Environment:', process.env.NODE_ENV || 'not set');
    console.log('📥 Database host:', process.env.DB_HOST || 'not set');
    console.log('📥 Database name:', process.env.DB_NAME || 'not set');
    console.log('📥 ==========================================');
    
    const { email, password, role } = req.body;
    
    console.log('📥 Extracted data:', { 
      email: email || 'MISSING', 
      password: password ? '***' : 'MISSING',
      role: role || 'not provided',
      emailType: typeof email,
      passwordType: typeof password
    });
    
    // Registration now requires admin authentication
    // This endpoint should only be called by authenticated admins/hr_executives
    const currentUserRole = req.user?.role;
    const isAdminRequest = currentUserRole === 'admin' || currentUserRole === 'hr_executive';
    
    // Require admin authentication
    if (!isAdminRequest) {
      console.error('❌ Unauthorized registration attempt - admin authentication required');
      return res.status(403).json({ 
        message: 'Only administrators can create new user accounts. Please contact your administrator.' 
      });
    }
    
    // For admin requests, use the provided role or default to 'hr_executive'
    let finalRole = 'hr_executive';
    if (role) {
      finalRole = role.toLowerCase().trim();
    }
    
    const normalizedRole = finalRole.toLowerCase().trim();

    console.log('📝 Register user request received:', { 
      email, 
      role: normalizedRole,
      isPublicRegistration: !req.user,
      currentUserRole,
      hasPassword: !!password
    });

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Validate role if admin is creating
    if (isAdminRequest) {
      if (!['admin', 'hr_executive', 'employee'].includes(normalizedRole)) {
        console.error('Invalid role in register endpoint:', { role: normalizedRole });
        return res.status(400).json({ 
          message: `Invalid role: "${normalizedRole}". Allowed roles: admin, hr_executive, employee` 
        });
      }

      // HR executives cannot create admin accounts - only admins can
      if (currentUserRole === 'hr_executive' && normalizedRole === 'admin') {
        return res.status(403).json({ 
          message: 'HR executives cannot create admin accounts. Only admins can create admin accounts.' 
        });
      }
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      const errorMessage = passwordValidation.errors.length > 0 
        ? `Password validation failed: ${passwordValidation.errors.join(', ')}`
        : 'Password validation failed. Password must be at least 8 characters with uppercase, lowercase, number, and special character.';
      return res.status(400).json({ 
        message: errorMessage,
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
      console.log(`💾 Inserting user into database: ${email} with role: ${normalizedRole}`);
      console.log(`💾 Using hashed password (length: ${hashedPassword.length})`);
      
      result = await pool.query(
        'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
        [email, hashedPassword, normalizedRole]
      );
      
      if (!result.rows || result.rows.length === 0) {
        throw new Error('User insertion returned no rows');
      }
      
      console.log('✅ User inserted successfully:', result.rows[0]);
      
      // Verify the user was actually inserted by querying it back
      const verifyResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (verifyResult.rows.length === 0) {
        throw new Error('User was not found in database after insertion');
      }
      console.log('✅ Verified user exists in database:', verifyResult.rows[0].email);
      
    } catch (dbError) {
      console.error('❌ Database error creating user:', {
        code: dbError.code,
        message: dbError.message,
        detail: dbError.detail,
        constraint: dbError.constraint,
        stack: dbError.stack
      });
      
      if (dbError.code === '23514') {
        return res.status(400).json({ 
          message: `Invalid role: "${normalizedRole}". Database constraint violation. The role must be one of: admin, hr_executive, employee. Please contact administrator.` 
        });
      }
      if (dbError.code === '23505') {
        return res.status(400).json({ 
          message: 'Email already exists. Please use a different email.' 
        });
      }
      
      // Return the actual database error message for debugging
      return res.status(500).json({ 
        message: `Database error: ${dbError.message || 'Failed to create user account'}`,
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    const user = result.rows[0];
    const elapsedTime = Date.now() - startTime;
    console.log(`✅ User account created successfully: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
    console.log(`⏱️ Registration took ${elapsedTime}ms`);
    
    // Double-check: Query the database to confirm user exists
    try {
      const verifyQuery = await pool.query('SELECT id, email, role, created_at FROM users WHERE id = $1', [user.id]);
      if (verifyQuery.rows.length === 0) {
        console.error('❌ CRITICAL: User was not found in database after insertion!');
        return res.status(500).json({ 
          message: 'Account creation failed: User was not saved to database. Please try again.' 
        });
      }
      console.log('✅ Verified user exists in database:', verifyQuery.rows[0]);
    } catch (verifyError) {
      console.error('❌ Error verifying user in database:', verifyError);
      // Continue anyway as the INSERT was successful
    }

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

    const totalTime = Date.now() - startTime;
    console.log(`✅ Account created successfully for: ${user.email}`);
    console.log(`⏱️ Total registration time: ${totalTime}ms`);
    console.log('📤 Sending success response...');
    
    const responseData = {
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
    
    if (employee) {
      responseData.employee = employee;
    }
    
    console.log('📤 Response data:', JSON.stringify(responseData, null, 2));
    res.status(201).json(responseData);
    console.log('✅ Response sent successfully');
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ ==========================================');
    console.error('❌ Register error occurred');
    console.error('❌ Error time:', new Date().toISOString());
    console.error('❌ Elapsed time:', totalTime + 'ms');
    console.error('❌ Error type:', error?.constructor?.name || 'Unknown');
    console.error('❌ Error message:', error?.message || 'No message');
    console.error('❌ Error code:', error?.code || 'No code');
    console.error('❌ Error detail:', error?.detail || 'No detail');
    console.error('❌ Error stack:', error?.stack || 'No stack');
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('❌ ==========================================');
    
    const errorMessage = error?.message || 'Server error';
    const statusCode = error?.code === '23505' ? 400 : (error?.status || 500);
    
    res.status(statusCode).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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

// Get all users (admin only)
export const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password - generate reset token
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    const user = userResult.rows[0];

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Delete any existing reset tokens for this user
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    // Save reset token
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, resetToken, expiresAt]
    );

    // In production, send email with reset link
    // For now, we'll return the token in development mode
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    console.log('🔐 Password reset token generated for:', email);
    if (process.env.NODE_ENV === 'development') {
      console.log('🔗 Reset link (DEV ONLY):', resetLink);
    }

    // In production, send email here
    // await sendPasswordResetEmail(user.email, resetLink);

    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.',
      // Only return token in development
      ...(process.env.NODE_ENV === 'development' && { resetLink })
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password with token
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        message: passwordValidation.errors.join(', '),
        errors: passwordValidation.errors
      });
    }

    // Find valid reset token
    const tokenResult = await pool.query(
      `SELECT prt.*, u.id as user_id, u.email 
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const resetTokenData = tokenResult.rows[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, resetTokenData.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1',
      [token]
    );

    console.log('✅ Password reset successful for user:', resetTokenData.email);

    res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


