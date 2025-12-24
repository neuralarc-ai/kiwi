import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { pool } from '../config/database.js';

dotenv.config();

const createAdmin = async () => {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@hr.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    
    // Check if admin already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('Admin user already exists!');
      return;
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'admin']
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('\n⚠️  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();

