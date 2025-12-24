import { pool } from '../config/database.js';

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
  const MAX_ALLOWED_LEAVES = 2; // Maximum allowed leave days per month before deduction
  
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
  
  // Calculate daily salary (assuming 30 working days per month)
  const workingDaysPerMonth = 30;
  const dailySalary = salary / workingDaysPerMonth;
  
  // Deduct for excess leave days
  const leaveDeduction = dailySalary * excessLeaveDays;
  
  console.log(`   - Excess Days: ${excessLeaveDays}`);
  console.log(`   - Daily Salary: ₹${dailySalary.toFixed(2)}`);
  console.log(`   - Deduction: ₹${leaveDeduction.toFixed(2)}`);
  
  return Math.round(leaveDeduction * 100) / 100; // Round to 2 decimal places
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
            
            // Calculate base deductions (excluding previous leave deduction)
            const baseDeductions = parseFloat(payroll.deductions || 0) - parseFloat(payroll.leave_deduction || 0);
            const finalDeductions = baseDeductions + leaveDeduction;
            const netSalary = basicSalary + allowances - finalDeductions;
            
            // Update payroll
            await pool.query(
              `UPDATE payroll SET 
                deductions = $1, 
                leave_deduction = $2, 
                net_salary = $3
               WHERE id = $4`,
              [finalDeductions, leaveDeduction, netSalary, payroll.id]
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
        // Ensure salary is a number
        const basicSalary = parseFloat(row.basic_salary || row.salary || 0);
        let leaveDeduction = 0; // Always start with 0, then calculate
        
        // ALWAYS calculate leave deduction if employee has salary (even if payroll doesn't exist)
        if (basicSalary > 0) {
          try {
            const calculatedDeduction = await calculateLeaveDeduction(row.employee_id, parseInt(month), parseInt(year), basicSalary);
            // Use calculated deduction (it's always more accurate)
            leaveDeduction = calculatedDeduction;
            console.log(`💰 FINAL: Employee ${row.employee_id} (${row.first_name} ${row.last_name}): Leave deduction = ₹${leaveDeduction.toFixed(2)} for ${month}/${year} (Salary: ₹${basicSalary.toFixed(2)})`);
            
            // If deduction changed and payroll exists, update it
            if (row.payroll_id && Math.abs(leaveDeduction - parseFloat(row.leave_deduction || 0)) > 0.01) {
              console.log(`🔄 Updating payroll record ${row.payroll_id} with new leave deduction`);
            }
          } catch (calcError) {
            console.error(`❌ Error calculating leave deduction for employee ${row.employee_id}:`, calcError);
            leaveDeduction = parseFloat(row.leave_deduction || 0); // Fallback to stored value
          }
        } else {
          console.log(`⚠️ Employee ${row.employee_id} (${row.first_name} ${row.last_name}): No salary found (₹${basicSalary}), cannot calculate leave deduction`);
        }
        
        const allowances = parseFloat(row.allowances || 0);
        const otherDeductions = parseFloat((row.deductions || 0) - (row.leave_deduction || 0));
        const totalDeductions = otherDeductions + leaveDeduction;
        const netSalary = row.net_salary ? parseFloat(row.net_salary) : (basicSalary + allowances - totalDeductions);
        
        // If payroll exists but leave deduction changed, update it in database
        if (row.payroll_id) {
          const storedDeduction = parseFloat(row.leave_deduction || 0);
          if (Math.abs(leaveDeduction - storedDeduction) > 0.01) {
            const finalDeductions = otherDeductions + leaveDeduction;
            const finalNetSalary = basicSalary + allowances - finalDeductions;
            
            await pool.query(
              `UPDATE payroll SET 
                deductions = $1, 
                leave_deduction = $2, 
                net_salary = $3
               WHERE id = $4`,
              [finalDeductions, leaveDeduction, finalNetSalary, row.payroll_id]
            );
            
            console.log(`✅ Updated payroll ${row.payroll_id} with new leave deduction: ₹${leaveDeduction.toFixed(2)} (was ₹${storedDeduction.toFixed(2)})`);
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
      const employeeSalary = parseFloat(employee.rows[0].salary || 0);
      const finalSalary = basic_salary !== undefined ? parseFloat(basic_salary) : (existingPayroll.basic_salary || employeeSalary);
      
      // Recalculate leave deduction
      const leaveDeduction = await calculateLeaveDeduction(employee_id, month, year, finalSalary);
      
      const finalAllowances = parseFloat(allowances !== undefined ? allowances : (existingPayroll.allowances || 0));
      const baseDeductions = parseFloat(deductions !== undefined ? deductions : (existingPayroll.deductions || 0) - (existingPayroll.leave_deduction || 0));
      const finalDeductions = baseDeductions + leaveDeduction;
      const net_salary = finalSalary + finalAllowances - finalDeductions;
      const updatedStatus = status || existingPayroll.status;
      
      const updateResult = await pool.query(
        `UPDATE payroll SET basic_salary = $1, allowances = $2, deductions = $3, leave_deduction = $4, net_salary = $5, status = $6 WHERE id = $7 RETURNING *`,
        [finalSalary, finalAllowances, finalDeductions, leaveDeduction, net_salary, updatedStatus, existingPayroll.id]
      );
      return res.json(updateResult.rows[0]);
    }

    // Use provided salary or employee's salary from database, default to 0 if neither exists
    const employeeSalary = parseFloat(employee.rows[0].salary || 0);
    const finalSalary = basic_salary !== undefined ? parseFloat(basic_salary) : employeeSalary;
    
    // Calculate leave deduction (if employee has more than 2 leaves in the month)
    const leaveDeduction = await calculateLeaveDeduction(employee_id, month, year, finalSalary);
    
    const finalAllowances = parseFloat(allowances || 0);
    const finalDeductions = parseFloat(deductions || 0) + leaveDeduction; // Add leave deduction to deductions
    const net_salary = finalSalary + finalAllowances - finalDeductions;
    const payrollStatus = status || 'pending'; // Default to 'pending' if not provided
    
    console.log(`Payroll calculation for employee ${employee_id} (${month}/${year}):`);
    console.log(`  Basic Salary: $${finalSalary.toFixed(2)}`);
    console.log(`  Allowances: $${finalAllowances.toFixed(2)}`);
    console.log(`  Deductions (including leave deduction): $${finalDeductions.toFixed(2)}`);
    console.log(`  Leave Deduction: $${leaveDeduction.toFixed(2)}`);
    console.log(`  Net Salary: $${net_salary.toFixed(2)}`);

    const result = await pool.query(
      `INSERT INTO payroll (employee_id, month, year, basic_salary, allowances, deductions, leave_deduction, net_salary, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [employee_id, month, year, finalSalary, finalAllowances, finalDeductions, leaveDeduction, net_salary, payrollStatus]
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
        const deductions = defaultDeductions + leaveDeduction; // Add leave deduction to deductions
        const net_salary = basic_salary + allowances - deductions;

        const result = await pool.query(
          `INSERT INTO payroll (employee_id, month, year, basic_salary, allowances, deductions, leave_deduction, net_salary, status, processed_by, processed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processed', $9, CURRENT_TIMESTAMP)
           RETURNING *`,
          [employee.id, month, year, basic_salary, allowances, deductions, leaveDeduction, net_salary, userId]
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
    const basic = basic_salary !== undefined ? parseFloat(basic_salary) : parseFloat(existingPayroll.basic_salary || 0);
    const allow = allowances !== undefined ? parseFloat(allowances) : parseFloat(existingPayroll.allowances || 0);
    
    // Recalculate leave deduction based on current month/year
    const leaveDeduction = await calculateLeaveDeduction(existingPayroll.employee_id, existingPayroll.month, existingPayroll.year, basic);
    
    // Calculate base deductions (excluding previous leave deduction)
    const baseDeductions = deductions !== undefined 
      ? parseFloat(deductions) 
      : (parseFloat(existingPayroll.deductions || 0) - parseFloat(existingPayroll.leave_deduction || 0));
    
    // Add leave deduction to base deductions
    const finalDeductions = baseDeductions + leaveDeduction;
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
        net_salary = $5,
        status = COALESCE($6, status),
        processed_at = CASE WHEN $6 IN ('processed', 'paid') AND status NOT IN ('processed', 'paid') THEN CURRENT_TIMESTAMP ELSE processed_at END
      WHERE id = $7
      RETURNING *`,
      [basic, allow, finalDeductions, leaveDeduction, net_salary, updatedStatus, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update payroll error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



