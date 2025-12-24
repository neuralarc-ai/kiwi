import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function checkAndAddEmployees() {
  try {
    const checkResult = await pool.query('SELECT COUNT(*) as count FROM employees');
    const count = parseInt(checkResult.rows[0].count);
    console.log(`\n📊 Current employees in database: ${count}\n`);
    
    if (count > 0) {
      console.log('✅ Employees already exist. Showing existing employees:\n');
      const existing = await pool.query('SELECT id, employee_id, first_name, last_name, email, department, salary FROM employees ORDER BY id LIMIT 10');
      existing.rows.forEach(emp => {
        console.log(`  ${emp.employee_id}: ${emp.first_name} ${emp.last_name} - ${emp.department || 'N/A'} - $${emp.salary || 0}`);
      });
      return;
    }
    
    console.log('⚠️  No employees found. Creating dummy employees...\n');
    
    const employees = [
      ['EMP001', 'John', 'Doe', 'john.doe@company.com', '+1234567890', 'Engineering', 'Software Engineer', '2023-01-15', 75000, '123 Main St'],
      ['EMP002', 'Jane', 'Smith', 'jane.smith@company.com', '+1234567891', 'Marketing', 'Marketing Manager', '2023-02-20', 65000, '456 Oak Ave'],
      ['EMP003', 'Mike', 'Johnson', 'mike.johnson@company.com', '+1234567892', 'Sales', 'Sales Representative', '2023-03-10', 55000, '789 Pine Rd'],
      ['EMP004', 'Sarah', 'Williams', 'sarah.williams@company.com', '+1234567893', 'HR', 'HR Executive', '2023-04-05', 60000, '321 Elm St'],
      ['EMP005', 'David', 'Brown', 'david.brown@company.com', '+1234567894', 'Finance', 'Financial Analyst', '2023-05-12', 70000, '654 Maple Dr']
    ];
    
    for (const emp of employees) {
      try {
        const result = await pool.query(
          `INSERT INTO employees (employee_id, first_name, last_name, email, phone, department, position, hire_date, salary, address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (employee_id) DO NOTHING
           RETURNING employee_id, first_name, last_name`,
          emp
        );
        
        if (result.rows.length > 0) {
          console.log(`  ✅ Created: ${result.rows[0].employee_id} - ${result.rows[0].first_name} ${result.rows[0].last_name}`);
        } else {
          console.log(`  ⚠️  ${emp[0]} already exists, skipped`);
        }
      } catch (error) {
        console.error(`  ❌ Error creating ${emp[0]}:`, error.message);
      }
    }
    
    const finalCheck = await pool.query('SELECT COUNT(*) as count FROM employees');
    console.log(`\n✅ Total employees: ${finalCheck.rows[0].count}\n`);
    
    const all = await pool.query('SELECT employee_id, first_name, last_name, department, salary FROM employees ORDER BY id');
    console.log('📋 All Employees:');
    all.rows.forEach(emp => {
      console.log(`  ${emp.employee_id}: ${emp.first_name} ${emp.last_name} - ${emp.department} - $${emp.salary}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndAddEmployees();
