import { pool } from '../config/database.js';

export const getEmployeeReport = async (req, res) => {
  try {
    const { department, status } = req.query;
    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (department) {
      query += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get employee report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAttendanceReport = async (req, res) => {
  try {
    const { start_date, end_date, employee_id } = req.query;
    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_id as emp_id,
             e.department, e.position
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND a.date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND a.date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (employee_id) {
      query += ` AND a.employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    query += ' ORDER BY a.date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getLeaveReport = async (req, res) => {
  try {
    const { start_date, end_date, status, leave_type } = req.query;
    let query = `
      SELECT l.*, e.first_name, e.last_name, e.employee_id as emp_id,
             e.department
      FROM leaves l
      JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND l.start_date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND l.end_date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    if (status) {
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (leave_type) {
      query += ` AND l.leave_type = $${paramCount}`;
      params.push(leave_type);
      paramCount++;
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get leave report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getPayrollReport = async (req, res) => {
  try {
    const { month, year } = req.query;
    let query = `
      SELECT p.*, e.first_name, e.last_name, e.employee_id as emp_id,
             e.department, e.position
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

    query += ' ORDER BY p.year DESC, p.month DESC';

    const result = await pool.query(query, params);

    // Calculate totals
    const totals = result.rows.reduce(
      (acc, row) => {
        acc.totalPayroll += parseFloat(row.net_salary || 0);
        acc.totalEmployees += 1;
        return acc;
      },
      { totalPayroll: 0, totalEmployees: 0 }
    );

    res.json({
      payrolls: result.rows,
      summary: {
        ...totals,
        averageSalary: totals.totalEmployees > 0 ? totals.totalPayroll / totals.totalEmployees : 0,
      },
    });
  } catch (error) {
    console.error('Get payroll report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



