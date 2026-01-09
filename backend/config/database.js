import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Log database configuration (without sensitive data)
console.log('🔧 Database configuration:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hr_management',
  user: process.env.DB_USER || 'postgres',
  hasPassword: !!process.env.DB_PASSWORD,
  sslRequired: process.env.DB_HOST?.includes('supabase') || process.env.DB_SSL === 'true',
  nodeEnv: process.env.NODE_ENV || 'not set'
});

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hr_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // SSL configuration for Supabase (and other cloud databases)
  ssl: process.env.DB_HOST?.includes('supabase') || process.env.DB_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection pool events
pool.on('connect', (client) => {
  console.log('✅ New database client connected');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle database client:', err);
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection test failed:', err.message);
  } else {
    console.log('✅ Database connection test successful:', res.rows[0]);
  }
});

// Initialize database tables
export const initializeDatabase = async () => {
  try {
    // Users table (for authentication)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'hr_executive', 'employee', 'accountant')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Password reset tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Password reset tokens table created/verified');
    
    // Update existing table constraint to allow all roles including 'accountant'
    try {
      // First, try to drop any existing role constraint
      await pool.query(`
        DO $$ 
        BEGIN
          -- Drop old constraint if it exists (try different possible names)
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check1;
        EXCEPTION WHEN OTHERS THEN
          -- Ignore errors if constraint doesn't exist
          NULL;
        END $$;
      `);
      
      // Add new constraint that allows all roles including accountant
      await pool.query(`
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('admin', 'hr_executive', 'employee', 'accountant'));
      `);
      console.log('✅ Updated users table constraint to allow all roles including accountant');
    } catch (constraintError) {
      // If constraint already exists with correct values, that's fine
      if (constraintError.code === '42710' || constraintError.message?.includes('already exists')) {
        console.log('✅ Users table constraint already allows all roles');
      } else {
        console.warn('⚠️ Could not update users table constraint:', constraintError.message);
        // Try to verify the constraint allows employee
        try {
          const checkResult = await pool.query(`
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE table_name = 'users' AND constraint_name LIKE '%role%'
          `);
          console.log('Current role constraint:', checkResult.rows);
        } catch (e) {
          console.error('Could not check constraint:', e);
        }
      }
    }

    // Employees table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        department VARCHAR(100),
        position VARCHAR(100),
        hire_date DATE,
        salary DECIMAL(10, 2),
        profile_photo VARCHAR(500),
        address TEXT,
        employee_type VARCHAR(50) DEFAULT 'Employee',
        status VARCHAR(20) DEFAULT 'active',
        bank_details_url VARCHAR(500),
        pan_card_url VARCHAR(500),
        aadhar_card_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add document columns if they don't exist (for existing databases)
    try {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_details_url') THEN
            ALTER TABLE employees ADD COLUMN bank_details_url VARCHAR(500);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pan_card_url') THEN
            ALTER TABLE employees ADD COLUMN pan_card_url VARCHAR(500);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'aadhar_card_url') THEN
            ALTER TABLE employees ADD COLUMN aadhar_card_url VARCHAR(500);
          END IF;
          
          -- Add OCR extracted data columns
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_account_no') THEN
            ALTER TABLE employees ADD COLUMN bank_account_no VARCHAR(50);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_name') THEN
            ALTER TABLE employees ADD COLUMN bank_name VARCHAR(200);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_ifsc') THEN
            ALTER TABLE employees ADD COLUMN bank_ifsc VARCHAR(20);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_verified') THEN
            ALTER TABLE employees ADD COLUMN bank_verified BOOLEAN DEFAULT FALSE;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pan_number') THEN
            ALTER TABLE employees ADD COLUMN pan_number VARCHAR(20);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pan_verified') THEN
            ALTER TABLE employees ADD COLUMN pan_verified BOOLEAN DEFAULT FALSE;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'aadhar_number') THEN
            ALTER TABLE employees ADD COLUMN aadhar_number VARCHAR(20);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'aadhar_verified') THEN
            ALTER TABLE employees ADD COLUMN aadhar_verified BOOLEAN DEFAULT FALSE;
          END IF;
          
          -- Add verification system fields
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pan_name') THEN
            ALTER TABLE employees ADD COLUMN pan_name VARCHAR(200);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pan_dob') THEN
            ALTER TABLE employees ADD COLUMN pan_dob VARCHAR(20);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'aadhar_name') THEN
            ALTER TABLE employees ADD COLUMN aadhar_name VARCHAR(200);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'aadhar_dob') THEN
            ALTER TABLE employees ADD COLUMN aadhar_dob VARCHAR(20);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_account_holder_name') THEN
            ALTER TABLE employees ADD COLUMN bank_account_holder_name VARCHAR(200);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'verification_score') THEN
            ALTER TABLE employees ADD COLUMN verification_score INTEGER DEFAULT 0;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'verification_status') THEN
            ALTER TABLE employees ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'verification_flags') THEN
            ALTER TABLE employees ADD COLUMN verification_flags JSONB;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hr_approved') THEN
            ALTER TABLE employees ADD COLUMN hr_approved BOOLEAN DEFAULT FALSE;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hr_approved_by') THEN
            ALTER TABLE employees ADD COLUMN hr_approved_by INTEGER REFERENCES users(id);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hr_approved_at') THEN
            ALTER TABLE employees ADD COLUMN hr_approved_at TIMESTAMP;
          END IF;
          
          -- Add emergency contact fields
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'emergency_contact_relation') THEN
            ALTER TABLE employees ADD COLUMN emergency_contact_relation VARCHAR(50);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'emergency_contact') THEN
            ALTER TABLE employees ADD COLUMN emergency_contact VARCHAR(20);
          END IF;
        END $$;
      `);
      console.log('✅ Document columns and OCR fields verified/added to employees table');
    } catch (error) {
      console.warn('⚠️ Could not add document columns (may already exist):', error.message);
    }

    // Attendance table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'on_leave')),
        check_in_time TIME,
        check_out_time TIME,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, date)
      )
    `);

    // Leaves table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        applied_by INTEGER REFERENCES users(id),
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add applied_by column if it doesn't exist (migration)
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'leaves' AND column_name = 'applied_by'
        ) THEN
          ALTER TABLE leaves ADD COLUMN applied_by INTEGER REFERENCES users(id);
        END IF;
      END $$;
    `);

    // Payroll table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        year INTEGER NOT NULL,
        basic_salary DECIMAL(10, 2) NOT NULL,
        allowances DECIMAL(10, 2) DEFAULT 0,
        deductions DECIMAL(10, 2) DEFAULT 0,
        leave_deduction DECIMAL(10, 2) DEFAULT 0,
        net_salary DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
        processed_at TIMESTAMP,
        processed_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, month, year)
      )
    `);
    
    // Add leave_deduction column if it doesn't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'payroll' AND column_name = 'leave_deduction'
        ) THEN
          ALTER TABLE payroll ADD COLUMN leave_deduction DECIMAL(10, 2) DEFAULT 0;
        END IF;
      END $$;
    `);

    // Add tds column if it doesn't exist (for existing databases)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'payroll' AND column_name = 'tds'
        ) THEN
          ALTER TABLE payroll ADD COLUMN tds DECIMAL(10, 2) DEFAULT 0;
        END IF;
      END $$;
    `);

    // Settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'text',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activities/Logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        employee_id INTEGER REFERENCES employees(id),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Performance table - calculated from monthly working hours
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        year INTEGER NOT NULL,
        total_working_days INTEGER DEFAULT 0,
        present_days INTEGER DEFAULT 0,
        absent_days INTEGER DEFAULT 0,
        late_days INTEGER DEFAULT 0,
        on_leave_days INTEGER DEFAULT 0,
        total_working_hours DECIMAL(10, 2) DEFAULT 0,
        expected_working_hours DECIMAL(10, 2) DEFAULT 0,
        performance_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (performance_percentage >= 0 AND performance_percentage <= 100),
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(employee_id, month, year)
      )
    `);

    // Add missing columns if table exists with old schema
    await pool.query(`
      DO $$ 
      BEGIN
        -- Add total_working_days if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'total_working_days'
        ) THEN
          ALTER TABLE performance ADD COLUMN total_working_days INTEGER DEFAULT 0;
        END IF;

        -- Add present_days if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'present_days'
        ) THEN
          ALTER TABLE performance ADD COLUMN present_days INTEGER DEFAULT 0;
        END IF;

        -- Add absent_days if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'absent_days'
        ) THEN
          ALTER TABLE performance ADD COLUMN absent_days INTEGER DEFAULT 0;
        END IF;

        -- Add late_days if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'late_days'
        ) THEN
          ALTER TABLE performance ADD COLUMN late_days INTEGER DEFAULT 0;
        END IF;

        -- Add on_leave_days if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'on_leave_days'
        ) THEN
          ALTER TABLE performance ADD COLUMN on_leave_days INTEGER DEFAULT 0;
        END IF;

        -- Add total_working_hours if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'total_working_hours'
        ) THEN
          ALTER TABLE performance ADD COLUMN total_working_hours DECIMAL(10, 2) DEFAULT 0;
        END IF;

        -- Add expected_working_hours if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'expected_working_hours'
        ) THEN
          ALTER TABLE performance ADD COLUMN expected_working_hours DECIMAL(10, 2) DEFAULT 0;
        END IF;

        -- Add performance_percentage if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'performance_percentage'
        ) THEN
          ALTER TABLE performance ADD COLUMN performance_percentage DECIMAL(5, 2) DEFAULT 0;
        END IF;

        -- Add calculated_at if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'calculated_at'
        ) THEN
          ALTER TABLE performance ADD COLUMN calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        -- Add updated_at if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE performance ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        END IF;

        -- Remove old overall_performance column if it exists (replaced by performance_percentage)
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'overall_performance'
        ) THEN
          ALTER TABLE performance DROP COLUMN overall_performance;
        END IF;

        -- Remove old columns from previous schema if they exist
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'productivity'
        ) THEN
          ALTER TABLE performance DROP COLUMN productivity;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'quality'
        ) THEN
          ALTER TABLE performance DROP COLUMN quality;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'communication'
        ) THEN
          ALTER TABLE performance DROP COLUMN communication;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'teamwork'
        ) THEN
          ALTER TABLE performance DROP COLUMN teamwork;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'punctuality'
        ) THEN
          ALTER TABLE performance DROP COLUMN punctuality;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'comments'
        ) THEN
          ALTER TABLE performance DROP COLUMN comments;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'performance' AND column_name = 'reviewed_by'
        ) THEN
          ALTER TABLE performance DROP COLUMN reviewed_by;
        END IF;
      END $$;
    `);

    // Update attendance table to include location
    await pool.query(`
      ALTER TABLE attendance 
      ADD COLUMN IF NOT EXISTS location VARCHAR(50) DEFAULT 'office' CHECK (location IN ('office', 'remote'))
    `);

    // Update attendance status constraint to include 'on_leave'
    await pool.query(`
      ALTER TABLE attendance 
      DROP CONSTRAINT IF EXISTS attendance_status_check
    `);
    
    await pool.query(`
      ALTER TABLE attendance 
      ADD CONSTRAINT attendance_status_check 
      CHECK (status IN ('present', 'absent', 'late', 'on_leave'))
    `);

    // Update employees table to include status
    await pool.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive'))
    `);

    // Update employees table to include employee_type
    await pool.query(`
      ALTER TABLE employees 
      ADD COLUMN IF NOT EXISTS employee_type VARCHAR(50) DEFAULT 'Employee'
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payroll_employee_month_year ON payroll(employee_id, month, year)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_performance_employee_month_year ON performance(employee_id, month, year)
    `);

    // Accounting entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounting_entries (
        id SERIAL PRIMARY KEY,
        head VARCHAR(255) NOT NULL,
        subhead VARCHAR(255),
        tds_percentage DECIMAL(5, 2) DEFAULT 0,
        gst_percentage DECIMAL(5, 2) DEFAULT 0,
        frequency VARCHAR(50),
        remarks TEXT,
        amount DECIMAL(15, 2) DEFAULT 0,
        entry_id INTEGER,
        month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
        year INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Drop old unique constraint if it exists
    await pool.query(`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'accounting_entries_head_subhead_month_year_key'
        ) THEN
          ALTER TABLE accounting_entries 
          DROP CONSTRAINT accounting_entries_head_subhead_month_year_key;
        END IF;
      END $$;
    `).catch(() => {
      // Ignore error if constraint doesn't exist
    });

    // Create partial unique constraint: Only for non-"Once" frequencies
    // This allows multiple "Once" entries with same head/subhead/month/year
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS accounting_entries_unique_recurring 
      ON accounting_entries (head, COALESCE(subhead, ''), month, year) 
      WHERE frequency IS NULL OR frequency != 'Once'
    `).catch(() => {
      // Ignore error if index already exists
    });

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    // Ignore sequence-related errors (23505 = unique constraint violation for sequences)
    // This happens when sequences already exist from a previous run
    // The tables will still be created/updated correctly
    if (error.code === '23505' && error.detail?.includes('_seq')) {
      console.log('⚠️  Some sequences already exist (this is normal)');
      console.log('✅ Database tables initialized successfully');
    } else {
      console.error('Error initializing database:', error);
      // Don't throw - allow server to continue if tables already exist
    }
  }
};

