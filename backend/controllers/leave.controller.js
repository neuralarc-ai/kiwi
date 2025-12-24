import { pool } from '../config/database.js';
import { recalculatePayrollForLeave } from './payroll.controller.js';

// Apply for leave
export const applyLeave = async (req, res) => {
  try {
    const { employee_id, leave_type, start_date, end_date, reason } = req.body;
    const userId = req.user?.id;

    console.log('📝 Creating leave with data:', { employee_id, leave_type, start_date, end_date, reason, userId });

    // Validate required fields
    if (!employee_id || !leave_type || !start_date || !end_date) {
      console.error('❌ Missing required fields:', { employee_id, leave_type, start_date, end_date });
      return res.status(400).json({ message: 'Required fields are missing: employee_id, leave_type, start_date, and end_date are required' });
    }

    // Ensure employee_id is a number
    const employeeId = parseInt(employee_id);
    if (isNaN(employeeId)) {
      console.error('❌ Invalid employee_id:', employee_id);
      return res.status(400).json({ message: 'Invalid employee_id. Must be a number.' });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('❌ Invalid dates:', { start_date, end_date });
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD format.' });
    }

    if (startDate > endDate) {
      console.error('❌ Start date after end date:', { start_date, end_date });
      return res.status(400).json({ message: 'Start date must be before or equal to end date.' });
    }

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
    if (employee.rows.length === 0) {
      console.error('❌ Employee not found:', employeeId);
      return res.status(404).json({ message: `Employee with ID ${employeeId} not found` });
    }

    // If HR/Admin is adding leave, set status to 'approved' automatically
    const userRole = req.user?.role;
    const leaveStatus = (userRole === 'admin' || userRole === 'hr_executive') ? 'approved' : 'pending';

    console.log(`📝 Inserting leave with status: ${leaveStatus} for employee ${employeeId}`);

    const result = await pool.query(
      `INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status, applied_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [employeeId, leave_type, start_date, end_date, reason || null, leaveStatus, userId || null]
    );

    const leave = result.rows[0];
    console.log('✅ Leave created successfully:', leave);

    // If leave is approved, recalculate payroll for affected months
    // Do this asynchronously to avoid blocking the response
    if (leaveStatus === 'approved') {
      recalculatePayrollForLeave(employeeId, start_date, end_date).catch(err => {
        console.error('⚠️ Error recalculating payroll after leave creation (non-blocking):', err);
        // Don't fail the request if payroll recalculation fails
      });
    }

    res.status(201).json(leave);
  } catch (error) {
    console.error('❌ Apply leave error:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all leaves (filtered by role)
export const getLeaves = async (req, res) => {
  try {
    const { status, employee_id, upcoming } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT l.*, e.first_name, e.last_name, e.employee_id as emp_id, e.email
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // If not admin/hr, only show their own leaves
    if (userRole !== 'admin' && userRole !== 'hr_executive') {
      const employee = await pool.query('SELECT id FROM employees WHERE id IN (SELECT employee_id FROM employees WHERE id IN (SELECT id FROM users WHERE id = $1))', [userId]);
      if (employee.rows.length > 0) {
        query += ` AND l.employee_id = $${paramCount}`;
        params.push(employee.rows[0].id);
        paramCount++;
      } else {
        // If user is not linked to an employee, return empty
        return res.json([]);
      }
    }

    if (status) {
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (employee_id) {
      query += ` AND l.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    // Filter for upcoming leaves (start_date >= today)
    if (upcoming === 'true') {
      query += ` AND l.start_date >= CURRENT_DATE`;
    }

    query += ' ORDER BY l.start_date ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single leave
export const getLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT l.*, e.first_name, e.last_name, e.employee_id as emp_id, e.email
       FROM leaves l
       JOIN employees e ON l.employee_id = e.id
       WHERE l.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get employee leaves
export const getEmployeeLeaves = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(
      'SELECT * FROM leaves WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get employee leaves error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve leave (Admin only)
export const approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const leave = await pool.query('SELECT * FROM leaves WHERE id = $1', [id]);
    if (leave.rows.length === 0) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    const result = await pool.query(
      `UPDATE leaves SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [userId, id]
    );

    const updatedLeave = result.rows[0];

    // Recalculate payroll when leave is approved
    if (updatedLeave.status === 'approved') {
      await recalculatePayrollForLeave(updatedLeave.employee_id, updatedLeave.start_date, updatedLeave.end_date);
    }

    res.json(updatedLeave);
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject leave (Admin only)
export const rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const userId = req.user.id;

    const leave = await pool.query('SELECT * FROM leaves WHERE id = $1', [id]);
    if (leave.rows.length === 0) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    const previousLeave = leave.rows[0];

    const result = await pool.query(
      `UPDATE leaves SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, rejection_reason = $2
       WHERE id = $3
       RETURNING *`,
      [userId, rejection_reason || null, id]
    );

    const updatedLeave = result.rows[0];

    // If leave was previously approved and now rejected, recalculate payroll
    if (previousLeave.status === 'approved') {
      await recalculatePayrollForLeave(updatedLeave.employee_id, updatedLeave.start_date, updatedLeave.end_date);
    }

    res.json(updatedLeave);
  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
