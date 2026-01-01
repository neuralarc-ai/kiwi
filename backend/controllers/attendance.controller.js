import { pool } from '../config/database.js';
import { recalculatePayrollForLeave } from './payroll.controller.js';

export const markAttendance = async (req, res) => {
  try {
    const { employee_id, date, status, check_in_time, check_out_time, notes, location } = req.body;

    if (!employee_id || !date || !status) {
      return res.status(400).json({ message: 'Employee ID, date, and status are required' });
    }

    if (!['present', 'absent', 'late', 'on_leave'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be present, absent, late, or on_leave' });
    }

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [employee_id]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if attendance date is before employee's hire date
    const hireDate = employee.rows[0].hire_date;
    if (hireDate && new Date(date) < new Date(hireDate)) {
      return res.status(400).json({ 
        message: `Cannot mark attendance before employee's joining date (${new Date(hireDate).toLocaleDateString()})` 
      });
    }

    // Check if attendance already marked for this date
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = $1 AND date = $2',
      [employee_id, date]
    );

    let result;
    const previousStatus = existing.rows.length > 0 ? existing.rows[0].status : null;
    
    if (existing.rows.length > 0) {
      // Update existing attendance
      result = await pool.query(
        `UPDATE attendance SET 
          status = $1,
          check_in_time = $2,
          check_out_time = $3,
          notes = $4,
          location = COALESCE($5, location)
        WHERE employee_id = $6 AND date = $7
        RETURNING *`,
        [status, check_in_time, check_out_time, notes, location || 'office', employee_id, date]
      );
    } else {
      // Create new attendance record
      result = await pool.query(
        `INSERT INTO attendance (employee_id, date, status, check_in_time, check_out_time, notes, location)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [employee_id, date, status, check_in_time, check_out_time, notes, location || 'office']
      );
    }

    const attendanceRecord = result.rows[0];
    
    // If status is 'on_leave' (or changed to/from 'on_leave'), recalculate payroll for that month
    if (status === 'on_leave' || previousStatus === 'on_leave') {
      const attendanceDate = new Date(date);
      const month = attendanceDate.getMonth() + 1;
      const year = attendanceDate.getFullYear();
      
      // Recalculate payroll for this month (use the date as both start and end)
      recalculatePayrollForLeave(employee_id, date, date).catch(err => {
        console.error('⚠️ Error recalculating payroll after attendance update (non-blocking):', err);
        // Don't fail the request if payroll recalculation fails
      });
    }

    res.json(attendanceRecord);
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_id as emp_id
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDailyAttendance = async (req, res) => {
  try {
    const { date } = req.params;
    const result = await pool.query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_id as emp_id, e.department, e.position
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.date = $1
       ORDER BY e.first_name, e.last_name`,
      [date]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get daily attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMonthlyAttendance = async (req, res) => {
  try {
    const { year, month } = req.params;
    
    // Calculate the first and last day of the month
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEndDate = new Date(year, month, 0);
    const monthEnd = monthEndDate.toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_id as emp_id, e.department, e.position, e.hire_date
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       WHERE EXTRACT(YEAR FROM a.date) = $1 
       AND EXTRACT(MONTH FROM a.date) = $2
       AND e.hire_date <= a.date
       ORDER BY a.date DESC, e.first_name, e.last_name`,
      [year, month]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get monthly attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEmployeeAttendance = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_id as emp_id
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.employee_id = $1
    `;
    const params = [employeeId];

    if (startDate && endDate) {
      query += ' AND a.date BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    query += ' ORDER BY a.date DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all employees with their attendance status for a specific date
export const getEmployeesWithAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const attendanceDate = date || new Date().toISOString().split('T')[0];

    // Get all employees with their attendance status for the date
    // Default to 'present' if no attendance record exists
    // Only include employees whose hire_date is on or before the attendance date
    const result = await pool.query(
      `SELECT 
        e.id,
        e.employee_id,
        e.first_name,
        e.last_name,
        e.email,
        e.department,
        e.position,
        e.hire_date,
        COALESCE(a.status, 'present') as attendance_status,
        a.check_in_time,
        a.check_out_time,
        a.notes,
        a.location
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id AND a.date = $1
      WHERE e.hire_date <= $1::date
      ORDER BY e.first_name, e.last_name`,
      [attendanceDate]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get employees with attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

