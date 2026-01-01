import { pool } from '../config/database.js';

// Helper function to get setting value from database
const getSettingValue = async (key, defaultValue) => {
  try {
    const result = await pool.query('SELECT setting_value FROM settings WHERE setting_key = $1', [key]);
    if (result.rows.length > 0 && result.rows[0].setting_value) {
      const value = result.rows[0].setting_value;
      // Try to parse as number, if it's a number string
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : numValue;
    }
    return defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
};

// Helper function to count leave days for an employee in a specific month
// Counts based on attendance records where status = 'on_leave' (not just approved leave applications)
const getEmployeeLeavesCount = async (employeeId, month, year) => {
  try {
    // Calculate the first and last day of the month
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndDate = new Date(year, month, 0);
    const monthEnd = monthEndDate.toISOString().split('T')[0];
    
    // Count attendance records where status = 'on_leave' for this month
    // This is the actual source of truth - if HR marks employee as on leave in attendance, it counts
    const attendanceResult = await pool.query(
      `SELECT COUNT(*) as leave_days
       FROM attendance
       WHERE employee_id = $1
       AND status = 'on_leave'
       AND date >= $2::date
       AND date <= $3::date`,
      [employeeId, monthStart, monthEnd]
    );
    
    const leaveDaysFromAttendance = parseInt(attendanceResult.rows[0]?.leave_days || 0);
    
    // Also count from leaves table (all leaves, not just approved) as backup
    const leavesResult = await pool.query(
      `SELECT 
        SUM(
          GREATEST(0, 
            (LEAST(end_date, $2::date) - GREATEST(start_date, $1::date) + 1)
          )
        ) as leave_days
       FROM leaves
       WHERE employee_id = $3
       AND start_date <= $2::date
       AND end_date >= $1::date`,
      [monthStart, monthEnd, employeeId]
    );
    
    const leaveDaysFromLeaves = parseInt(leavesResult.rows[0]?.leave_days || 0);
    
    // Use the maximum of both (attendance is primary, but leaves table can have future leaves)
    const leaveDays = Math.max(leaveDaysFromAttendance, leaveDaysFromLeaves);
    
    console.log(`📅 Employee ${employeeId}: ${leaveDays} leave days in ${month}/${year}`);
    console.log(`   - From attendance records: ${leaveDaysFromAttendance} days`);
    console.log(`   - From leaves table: ${leaveDaysFromLeaves} days`);
    console.log(`   - Final count: ${leaveDays} days (Month range: ${monthStart} to ${monthEnd})`);
    
    return leaveDays;
  } catch (error) {
    console.error('Error counting leave days:', error);
    // Fallback: count attendance records with on_leave status
    try {
      const fallbackResult = await pool.query(
        `SELECT COUNT(*) as leave_count
         FROM attendance
         WHERE employee_id = $1
         AND status = 'on_leave'
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3`,
        [employeeId, month, year]
      );
      const count = parseInt(fallbackResult.rows[0]?.leave_count || 0);
      console.log(`Employee ${employeeId}: ${count} on_leave attendance records (fallback) in ${month}/${year}`);
      return count;
    } catch (fallbackError) {
      console.error('Fallback leave count also failed:', fallbackError);
      return 0;
    }
  }
};

// Helper function to calculate leave deduction
const calculateLeaveDeduction = async (employeeId, month, year, basicSalary) => {
  // Get settings from database, with defaults
  const MAX_ALLOWED_LEAVES = await getSettingValue('payroll_max_allowed_leaves', 2);
  const WORKING_DAYS_PER_MONTH = await getSettingValue('payroll_working_days_per_month', 30);
  
  // Ensure basicSalary is a number
  const salary = parseFloat(basicSalary) || 0;
  
  if (!salary || salary <= 0) {
    console.log(`⚠️ Employee ${employeeId}: No salary provided (₹${salary}), cannot calculate deduction`);
    return 0;
  }
  
  const leaveDays = await getEmployeeLeavesCount(employeeId, month, year);
  console.log(`🔍 Calculating deduction for Employee ${employeeId}:`);
  console.log(`   - Month/Year: ${month}/${year}`);
  console.log(`   - Basic Salary: ₹${salary.toFixed(2)}`);
  console.log(`   - Leave Days: ${leaveDays}`);
  console.log(`   - Max Allowed: ${MAX_ALLOWED_LEAVES}`);
  
  if (leaveDays <= MAX_ALLOWED_LEAVES) {
    console.log(`   ✅ Within limit, no deduction`);
    return 0; // No deduction if leaves are within limit
  }
  
  // Calculate excess leave days
  const excessLeaveDays = leaveDays - MAX_ALLOWED_LEAVES;
  
  // Calculate daily salary using configured working days
  const dailySalary = salary / WORKING_DAYS_PER_MONTH;
  
  // Deduct for excess leave days
  const leaveDeduction = dailySalary * excessLeaveDays;
  
  console.log(`   - Excess Days: ${excessLeaveDays}`);
  console.log(`   - Daily Salary: ₹${dailySalary.toFixed(2)}`);
  console.log(`   - Deduction: ₹${leaveDeduction.toFixed(2)}`);
  
  return Math.round(leaveDeduction * 100) / 100; // Round to 2 decimal places
};

// Helper function to calculate TDS (Tax Deducted at Source)
// TDS is calculated as a percentage of gross salary (basic + allowances)
const calculateTDS = async (basicSalary, allowances) => {
  const grossSalary = parseFloat(basicSalary || 0) + parseFloat(allowances || 0);
  
  if (grossSalary <= 0) {
    return 0;
  }
  
  // Get TDS rate from settings, default to 10%
  const tdsRate = await getSettingValue('payroll_tds_percentage', 10) / 100;
  const monthlyTDS = grossSalary * tdsRate;
  
  return Math.round(monthlyTDS * 100) / 100; // Round to 2 decimal places
};

// Helper function to recalculate payroll for an employee when leaves change
export const recalculatePayrollForLeave = async (employeeId, leaveStartDate, leaveEndDate) => {
  try {
    // Validate inputs
    if (!employeeId || !leaveStartDate || !leaveEndDate) {
      console.error('⚠️ Invalid inputs for payroll recalculation:', { employeeId, leaveStartDate, leaveEndDate });
      return;
    }

    // Get all months that the leave spans
    const startDate = new Date(leaveStartDate);
    const endDate = new Date(leaveEndDate);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('⚠️ Invalid date format for payroll recalculation:', { leaveStartDate, leaveEndDate });
      return;
    }
    
    // Get all months between start and end date
    const monthsToUpdate = [];
    let currentDate = new Date(startDate);
    currentDate.setDate(1); // Start from first day of month
    
    const endMonth = new Date(endDate);
    endMonth.setDate(1);
    
    while (currentDate <= endMonth) {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      monthsToUpdate.push({ month, year });
      
      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    console.log(`🔄 Recalculating payroll for employee ${employeeId} for months:`, monthsToUpdate);
    
    // Recalculate payroll for each affected month
    for (const { month, year } of monthsToUpdate) {
      try {
        // Check if payroll exists for this month/year
        const existingPayroll = await pool.query(
          'SELECT * FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
          [employeeId, month, year]
        );
        
        if (existingPayroll.rows.length > 0) {
          const payroll = existingPayroll.rows[0];
          const basicSalary = parseFloat(payroll.basic_salary || 0);
          
          // Only recalculate if employee has a salary
          if (basicSalary > 0) {
            const allowances = parseFloat(payroll.allowances || 0);
            
            // Recalculate leave deduction
            const leaveDeduction = await calculateLeaveDeduction(employeeId, month, year, basicSalary);
            
            // Calculate TDS
            const tds = await calculateTDS(basicSalary, allowances);
            
            // Calculate base deductions (excluding previous leave deduction and TDS)
            const baseDeductions = parseFloat(payroll.deductions || 0) - parseFloat(payroll.leave_deduction || 0) - parseFloat(payroll.tds || 0);
            const finalDeductions = baseDeductions + leaveDeduction + tds;
            const netSalary = basicSalary + allowances - finalDeductions;
            
            // Update payroll
            await pool.query(
              `UPDATE payroll SET 
                deductions = $1, 
                leave_deduction = $2, 
                tds = $3,
                net_salary = $4
               WHERE id = $5`,
              [finalDeductions, leaveDeduction, tds, netSalary, payroll.id]
            );
            
            console.log(`✅ Recalculated payroll for employee ${employeeId} (${month}/${year}): Leave deduction = ₹${leaveDeduction.toFixed(2)}, Net salary = ₹${netSalary.toFixed(2)}`);
          } else {
            console.log(`⚠️ Employee ${employeeId} has no salary for ${month}/${year}, skipping payroll recalculation`);
          }
        } else {
          console.log(`ℹ️ No payroll record exists for employee ${employeeId} (${month}/${year}), skipping recalculation`);
        }
      } catch (monthError) {
        console.error(`⚠️ Error recalculating payroll for employee ${employeeId} (${month}/${year}):`, monthError);
        // Continue with next month even if this one fails
      }
    }
  } catch (error) {
    console.error('❌ Error recalculating payroll for leave:', error);
    console.error('Error details:', error.message, error.stack);
    // Don't throw error - we don't want to fail leave creation if payroll update fails
  }
};

export const getPayrolls = async (req, res) => {
  try {
    const { month, year, employee_id, all_employees } = req.query;
    
    console.log('Payroll API called with:', { month, year, employee_id, all_employees });
    
    // If all_employees is true, show all employees with their payroll status
    if (all_employees === 'true' && month && year) {
      // First, check if employees exist
      const employeeCheck = await pool.query('SELECT COUNT(*) as count FROM employees');
      console.log(`Total employees in database: ${employeeCheck.rows[0].count}`);
      
      let query = `
        SELECT 
          e.id as employee_id,
          e.first_name,
          e.last_name,
          e.employee_id as emp_id,
          e.email,
          e.department,
          e.position,
          e.salary,
          e.profile_photo,
          p.id as payroll_id,
          p.month,
          p.year,
          p.basic_salary,
          p.allowances,
          p.deductions,
          p.leave_deduction,
          p.tds,
          p.net_salary,
          p.status,
          CASE 
            WHEN p.status = 'paid' THEN 'paid'
            WHEN p.id IS NOT NULL THEN 'unpaid'
            ELSE 'unpaid'
          END as payment_status
        FROM employees e
        LEFT JOIN payroll p ON e.id = p.employee_id 
          AND p.month = $1 
          AND p.year = $2
        ORDER BY e.first_name, e.last_name
      `;
      
      const result = await pool.query(query, [month, year]);
      console.log(`Query returned ${result.rows.length} employees`);
      
      if (result.rows.length === 0) {
        console.log('No employees found in query result');
        return res.json([]);
      }
      
      // Format the response and calculate leave deduction for employees without payroll records
      const formatted = await Promise.all(result.rows.map(async (row) => {
        // ALWAYS use salary from employees table as source of truth for basic_salary
        // This ensures we always use the correct salary value (e.g., ₹20,000 not ₹19,996)
        const employeeSalary = parseFloat(row.salary || 0);
        // Always use employee salary as basic salary - it's the source of truth
        const basicSalary = employeeSalary;
        const allowances = parseFloat(row.allowances || 0);
        let leaveDeduction = 0; // Always start with 0, then calculate
        let tds = 0;
        
        // ALWAYS calculate leave deduction if employee has salary (even if payroll doesn't exist)
        if (basicSalary > 0) {
          try {
            const calculatedDeduction = await calculateLeaveDeduction(row.employee_id, parseInt(month), parseInt(year), basicSalary);
            // Use calculated deduction (it's always more accurate)
            leaveDeduction = calculatedDeduction;
            console.log(`💰 FINAL: Employee ${row.employee_id} (${row.first_name} ${row.last_name}): Leave deduction = ₹${leaveDeduction.toFixed(2)} for ${month}/${year} (Salary: ₹${basicSalary.toFixed(2)})`);
            
            // Calculate TDS
            tds = await calculateTDS(basicSalary, allowances);
            
            // If deduction changed and payroll exists, update it
            if (row.payroll_id && (Math.abs(leaveDeduction - parseFloat(row.leave_deduction || 0)) > 0.01 || Math.abs(tds - parseFloat(row.tds || 0)) > 0.01)) {
              console.log(`🔄 Updating payroll record ${row.payroll_id} with new leave deduction and TDS`);
            }
          } catch (calcError) {
            console.error(`❌ Error calculating leave deduction for employee ${row.employee_id}:`, calcError);
            leaveDeduction = parseFloat(row.leave_deduction || 0); // Fallback to stored value
            tds = parseFloat(row.tds || 0); // Fallback to stored TDS value
          }
        } else {
          console.log(`⚠️ Employee ${row.employee_id} (${row.first_name} ${row.last_name}): No salary found (₹${basicSalary}), cannot calculate leave deduction`);
          tds = parseFloat(row.tds || 0); // Use stored TDS if available
        }
        // Calculate other deductions (excluding TDS and leave deduction)
        // Get the base deductions that were manually entered (before TDS and leave deduction were added)
        const storedTotalDeductions = parseFloat(row.deductions || 0);
        const storedLeaveDeduction = parseFloat(row.leave_deduction || 0);
        const storedTDS = parseFloat(row.tds || 0);
        
        // Calculate other deductions: stored total - (stored TDS + stored leave deduction)
        // This gives us the base deductions that were manually entered
        const baseOtherDeductions = Math.max(0, storedTotalDeductions - storedLeaveDeduction - storedTDS);
        
        // Recalculate total deductions: base other deductions + current leave deduction + current TDS
        const totalDeductions = baseOtherDeductions + leaveDeduction + tds;
        
        // Recalculate net salary to ensure accuracy
        const netSalary = basicSalary + allowances - totalDeductions;
        
        // Always update payroll if TDS or deductions need recalculation
        // This ensures TDS is always 10% and calculations are correct
        if (row.payroll_id) {
          const storedDeduction = parseFloat(row.leave_deduction || 0);
          const storedTDS = parseFloat(row.tds || 0);
          const storedTotalDeductions = parseFloat(row.deductions || 0);
          const storedNetSalary = parseFloat(row.net_salary || 0);
          
          // Recalculate to ensure accuracy
          const finalDeductions = totalDeductions;
          const finalNetSalary = netSalary;
          
          // Always update if basic_salary doesn't match employee salary (source of truth)
          const basicSalaryChanged = Math.abs(basicSalary - parseFloat(row.basic_salary || 0)) > 0.01;
          
          // Update if values have changed (with small tolerance for floating point)
          const tdsChanged = Math.abs(tds - storedTDS) > 0.01;
          const leaveChanged = Math.abs(leaveDeduction - storedDeduction) > 0.01;
          const deductionsChanged = Math.abs(finalDeductions - storedTotalDeductions) > 0.01;
          const netSalaryChanged = Math.abs(finalNetSalary - storedNetSalary) > 0.01;
          
          if (basicSalaryChanged || tdsChanged || leaveChanged || deductionsChanged || netSalaryChanged) {
            await pool.query(
              `UPDATE payroll SET 
                basic_salary = $1,
                deductions = $2, 
                leave_deduction = $3,
                tds = $4,
                net_salary = $5
               WHERE id = $6`,
              [basicSalary, finalDeductions, leaveDeduction, tds, finalNetSalary, row.payroll_id]
            );
            
            console.log(`✅ Updated payroll ${row.payroll_id} for employee ${row.employee_id}:`);
            console.log(`   Basic Salary: ₹${basicSalary.toFixed(2)} (was ₹${parseFloat(row.basic_salary || 0).toFixed(2)})`);
            console.log(`   TDS: ₹${tds.toFixed(2)} (was ₹${storedTDS.toFixed(2)})`);
            console.log(`   Leave Deduction: ₹${leaveDeduction.toFixed(2)} (was ₹${storedDeduction.toFixed(2)})`);
            console.log(`   Total Deductions: ₹${finalDeductions.toFixed(2)} (was ₹${storedTotalDeductions.toFixed(2)})`);
            console.log(`   Net Salary: ₹${finalNetSalary.toFixed(2)} (was ₹${storedNetSalary.toFixed(2)})`);
          }
        }
        
        return {
          employee_id: row.employee_id,
          first_name: row.first_name,
          last_name: row.last_name,
          emp_id: row.emp_id,
          email: row.email,
          department: row.department,
          position: row.position,
          salary: row.salary || 0,
          profile_photo: row.profile_photo,
          payroll_id: row.payroll_id,
          month: row.month || parseInt(month),
          year: row.year || parseInt(year),
          basic_salary: basicSalary,
          allowances: allowances,
          deductions: totalDeductions,
          leave_deduction: leaveDeduction,
          tds: tds,
          net_salary: netSalary,
          status: row.status || 'pending',
          payment_status: row.payment_status
        };
      }));
      
      console.log(`Formatted ${formatted.length} employee records`);
      return res.json(formatted);
    }
    
    // Original query for existing payroll records only
    let query = `
      SELECT p.*, e.first_name, e.last_name, e.employee_id as emp_id,
             e.email, e.department, e.position, e.profile_photo
      FROM payroll p
      JOIN employees e ON p.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (month) {
      query += ` AND p.month = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    if (year) {
      query += ` AND p.year = $${paramCount}`;
      params.push(year);
      paramCount++;
    }

    if (employee_id) {
      query += ` AND p.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    query += ' ORDER BY p.year DESC, p.month DESC, e.first_name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get payrolls error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, e.first_name, e.last_name, e.employee_id as emp_id,
              e.email, e.department, e.position
       FROM payroll p
       JOIN employees e ON p.employee_id = e.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createPayroll = async (req, res) => {
  try {
    const { employee_id, month, year, basic_salary, allowances, deductions, status } = req.body;

    if (!employee_id || !month || !year) {
      return res.status(400).json({ message: 'Employee ID, month, and year are required' });
    }

    // Check if employee exists and get their salary
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [employee_id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if payroll already exists
    const existing = await pool.query(
      'SELECT * FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
      [employee_id, month, year]
    );
    if (existing.rows.length > 0) {
      // If payroll exists, recalculate with leave deduction and update
      const existingPayroll = existing.rows[0];
      // ALWAYS use employee's salary from database as source of truth
      // Never use basic_salary from request body or existing payroll - employee salary is correct
      const employeeSalary = parseFloat(employee.rows[0].salary || 0);
      const finalSalary = employeeSalary; // Always use employee salary
      
      // Recalculate leave deduction
      const leaveDeduction = await calculateLeaveDeduction(employee_id, month, year, finalSalary);
      
      const finalAllowances = parseFloat(allowances !== undefined ? allowances : (existingPayroll.allowances || 0));
      const tds = await calculateTDS(finalSalary, finalAllowances);
      const baseDeductions = parseFloat(deductions !== undefined ? deductions : (existingPayroll.deductions || 0) - (existingPayroll.leave_deduction || 0) - (existingPayroll.tds || 0));
      const finalDeductions = baseDeductions + leaveDeduction + tds;
      const net_salary = finalSalary + finalAllowances - finalDeductions;
      const updatedStatus = status || existingPayroll.status;
      
      const updateResult = await pool.query(
        `UPDATE payroll SET basic_salary = $1, allowances = $2, deductions = $3, leave_deduction = $4, tds = $5, net_salary = $6, status = $7 WHERE id = $8 RETURNING *`,
        [finalSalary, finalAllowances, finalDeductions, leaveDeduction, tds, net_salary, updatedStatus, existingPayroll.id]
      );
      return res.json(updateResult.rows[0]);
    }

    // ALWAYS use employee's salary from database as source of truth
    // Never use basic_salary from request body - it might be incorrect
    // The employee's salary (₹20,000) is the correct value
    const employeeSalary = parseFloat(employee.rows[0].salary || 0);
    const finalSalary = employeeSalary; // Always use employee salary, ignore basic_salary from request
    
    // Warn if basic_salary was provided but differs from employee salary
    if (basic_salary !== undefined) {
      const providedSalary = parseFloat(basic_salary);
      if (Math.abs(providedSalary - employeeSalary) > 0.01) {
        console.log(`⚠️ WARNING: Provided basic_salary (₹${providedSalary.toFixed(2)}) differs from employee salary (₹${employeeSalary.toFixed(2)}). Using employee salary.`);
      }
    }
    
    // Calculate leave deduction (if employee has more than 2 leaves in the month)
    const leaveDeduction = await calculateLeaveDeduction(employee_id, month, year, finalSalary);
    
    const finalAllowances = parseFloat(allowances || 0);
    const tds = calculateTDS(finalSalary, finalAllowances);
    const baseDeductions = parseFloat(deductions || 0);
    const finalDeductions = baseDeductions + leaveDeduction + tds; // Add leave deduction and TDS to deductions
    const net_salary = finalSalary + finalAllowances - finalDeductions;
    const payrollStatus = status || 'pending'; // Default to 'pending' if not provided
    
    console.log(`✅ Payroll calculation for employee ${employee_id} (${month}/${year}):`);
    console.log(`  Employee Salary (Source of Truth): ₹${employeeSalary.toFixed(2)}`);
    console.log(`  Basic Salary (Used): ₹${finalSalary.toFixed(2)}`);
    console.log(`  Allowances: ₹${finalAllowances.toFixed(2)}`);
    console.log(`  TDS: ₹${tds.toFixed(2)}`);
    console.log(`  Leave Deduction: ₹${leaveDeduction.toFixed(2)}`);
    console.log(`  Other Deductions: ₹${baseDeductions.toFixed(2)}`);
    console.log(`  Total Deductions: ₹${finalDeductions.toFixed(2)}`);
    console.log(`  Net Salary: ₹${net_salary.toFixed(2)}`);

    const result = await pool.query(
      `INSERT INTO payroll (employee_id, month, year, basic_salary, allowances, deductions, leave_deduction, tds, net_salary, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [employee_id, month, year, finalSalary, finalAllowances, finalDeductions, leaveDeduction, tds, net_salary, payrollStatus]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create payroll error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const processPayroll = async (req, res) => {
  try {
    const { month, year } = req.body;
    const userId = req.user.id;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    // Get all active employees
    const employees = await pool.query(
      "SELECT * FROM employees WHERE status = 'active'"
    );

    const results = [];

    for (const employee of employees.rows) {
      // Check if payroll already exists
      const existing = await pool.query(
        'SELECT * FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3',
        [employee.id, month, year]
      );

      if (existing.rows.length === 0) {
        const basic_salary = parseFloat(employee.salary || 0);
        const allowances = basic_salary * 0.1; // 10% as default allowance
        const defaultDeductions = basic_salary * 0.05; // 5% as default deduction
        
        // Calculate leave deduction (if employee has more than 2 leaves in the month)
        const leaveDeduction = await calculateLeaveDeduction(employee.id, month, year, basic_salary);
        const tds = await calculateTDS(basic_salary, allowances);
        const deductions = defaultDeductions + leaveDeduction + tds; // Add leave deduction and TDS to deductions
        const net_salary = basic_salary + allowances - deductions;

        const result = await pool.query(
          `INSERT INTO payroll (employee_id, month, year, basic_salary, allowances, deductions, leave_deduction, tds, net_salary, status, processed_by, processed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'processed', $10, CURRENT_TIMESTAMP)
           RETURNING *`,
          [employee.id, month, year, basic_salary, allowances, deductions, leaveDeduction, tds, net_salary, userId]
        );

        results.push(result.rows[0]);
      }
    }

    res.json({
      message: `Payroll processed for ${results.length} employees`,
      payrolls: results,
    });
  } catch (error) {
    console.error('Process payroll error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { basic_salary, allowances, deductions, status } = req.body;

    const payroll = await pool.query('SELECT * FROM payroll WHERE id = $1', [id]);
    if (payroll.rows.length === 0) {
      return res.status(404).json({ message: 'Payroll record not found' });
    }

    const existingPayroll = payroll.rows[0];
    const previousStatus = existingPayroll.status;
    
    // ALWAYS use employee's salary from database as source of truth
    // Never use basic_salary from request body or existing payroll - employee salary is correct
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [existingPayroll.employee_id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    const employeeSalary = parseFloat(employee.rows[0].salary || 0);
    const basic = employeeSalary; // Always use employee salary, ignore basic_salary from request
    const allow = allowances !== undefined ? parseFloat(allowances) : parseFloat(existingPayroll.allowances || 0);
    
    // Recalculate leave deduction based on current month/year
    const leaveDeduction = await calculateLeaveDeduction(existingPayroll.employee_id, existingPayroll.month, existingPayroll.year, basic);
    
    // Calculate TDS
    const tds = await calculateTDS(basic, allow);
    
    // Calculate base deductions (excluding previous leave deduction and TDS)
    const baseDeductions = deductions !== undefined 
      ? parseFloat(deductions) 
      : (parseFloat(existingPayroll.deductions || 0) - parseFloat(existingPayroll.leave_deduction || 0) - parseFloat(existingPayroll.tds || 0));
    
    // Add leave deduction and TDS to base deductions
    const finalDeductions = baseDeductions + leaveDeduction + tds;
    const net_salary = basic + allow - finalDeductions;

    // Handle status update - if status is provided, use it; otherwise keep current status
    let updatedStatus = status !== undefined ? status : existingPayroll.status;
    
    // Validate status value
    const validStatuses = ['pending', 'processed', 'paid'];
    if (updatedStatus && !validStatuses.includes(updatedStatus)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = await pool.query(
      `UPDATE payroll SET
        basic_salary = COALESCE($1, basic_salary),
        allowances = COALESCE($2, allowances),
        deductions = COALESCE($3, deductions),
        leave_deduction = COALESCE($4, leave_deduction),
        tds = COALESCE($5, tds),
        net_salary = $6,
        status = COALESCE($7, status),
        processed_at = CASE WHEN $7 IN ('processed', 'paid') AND status NOT IN ('processed', 'paid') THEN CURRENT_TIMESTAMP ELSE processed_at END
      WHERE id = $8
      RETURNING *`,
      [basic, allow, finalDeductions, leaveDeduction, tds, net_salary, updatedStatus, id]
    );

    // AUTO-SYNC: If status changed to 'paid', sync salary to accounting
    if (updatedStatus === 'paid' && previousStatus !== 'paid') {
      try {
        await syncSalaryToAccounting(existingPayroll.month, existingPayroll.year);
        console.log(`✅ Auto-synced salary to accounting for ${existingPayroll.month}/${existingPayroll.year}`);
      } catch (syncError) {
        console.error('⚠️ Error syncing salary to accounting (non-blocking):', syncError);
        // Don't fail the payroll update if sync fails
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update payroll error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to sync salary to accounting
const syncSalaryToAccounting = async (month, year) => {
  try {
    // Calculate total paid salaries - use gross salary (basic_salary + allowances) for accounting
    // This represents the total cost to the company, not net salary after deductions
    const payrollResult = await pool.query(
      `SELECT COALESCE(SUM(basic_salary + allowances), 0) as total_salary
       FROM payroll
       WHERE month = $1 AND year = $2 
       AND status = 'paid'
       AND (basic_salary + allowances) > 0`,
      [month, year]
    );
    
    const totalSalary = parseFloat(payrollResult.rows[0].total_salary) || 0;
    console.log(`📊 Syncing salary for ${month}/${year}: Found ₹${totalSalary} in paid salaries (gross: basic + allowances)`);

    // Check if accounting_entries table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'accounting_entries'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Accounting entries table does not exist, skipping sync');
      return; // Accounting table doesn't exist, skip sync
    }

    // Find or create "Salary & Wages" entry
    let salaryEntry = await pool.query(
      `SELECT id FROM accounting_entries 
       WHERE head = 'Salary & Wages' AND month = $1 AND year = $2`,
      [month, year]
    );

    if (salaryEntry.rows.length === 0) {
      // Create the entry if it doesn't exist
      await pool.query(
        `INSERT INTO accounting_entries 
         (head, subhead, tds_percentage, gst_percentage, frequency, remarks, amount, month, year)
         VALUES ('Salary & Wages', NULL, 10, 0, 'Monthly', 'Employee salaries and wages (Auto-synced from payroll)', $1, $2, $3)`,
        [totalSalary, month, year]
      );
      console.log(`✅ Created salary entry in accounting: ₹${totalSalary}`);
    } else {
      // Update existing entry
      await pool.query(
        `UPDATE accounting_entries 
         SET amount = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [totalSalary, salaryEntry.rows[0].id]
      );
      console.log(`✅ Updated salary entry in accounting: ₹${totalSalary}`);
    }
  } catch (error) {
    console.error('Error in syncSalaryToAccounting:', error);
    throw error; // Re-throw to be caught by caller
  }
};

