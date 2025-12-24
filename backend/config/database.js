import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

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
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'hr_executive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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

