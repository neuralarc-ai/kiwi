import { pool } from '../config/database.js';

// Get all performance records for a month
export const getMonthlyPerformance = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }
    
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Month must be between 1 and 12' });
    }
    
    // Get performance records with employee details
    const result = await pool.query(
      `SELECT 
        p.*,
        e.employee_id as emp_id,
        e.first_name,
        e.last_name,
        e.department,
        e.position
      FROM performance p
      JOIN employees e ON p.employee_id = e.id
      WHERE p.month = $1 AND p.year = $2
      ORDER BY e.first_name, e.last_name`,
      [monthNum, yearNum]
    );
    
    // Ensure performance_percentage is a number
    const rows = result.rows.map(row => ({
      ...row,
      performance_percentage: parseFloat(row.performance_percentage) || 0
    }));
    
    res.json(rows);
  } catch (error) {
    console.error('Get monthly performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or update performance manually
export const createOrUpdatePerformance = async (req, res) => {
  try {
    const {
      employee_id,
      month,
      year,
      performance_percentage
    } = req.body;

    console.log('Received performance data:', { employee_id, month, year, performance_percentage });

    // Validate required fields
    if (!employee_id || !month || !year) {
      return res.status(400).json({ 
        message: 'Employee ID, month, and year are required' 
      });
    }

    // Convert to numbers
    const empId = parseInt(employee_id);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    const perfPercent = parseFloat(performance_percentage);

    if (isNaN(empId) || isNaN(monthNum) || isNaN(yearNum)) {
      return res.status(400).json({ 
        message: 'Employee ID, month, and year must be valid numbers' 
      });
    }

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Month must be between 1 and 12' });
    }

    if (performance_percentage === undefined || performance_percentage === null || isNaN(perfPercent)) {
      return res.status(400).json({ 
        message: 'Performance percentage is required and must be a valid number' 
      });
    }

    // Validate performance percentage
    if (perfPercent < 0 || perfPercent > 100) {
      return res.status(400).json({ 
        message: 'Performance percentage must be between 0 and 100' 
      });
    }

    // Check if employee exists
    const employee = await pool.query('SELECT * FROM employees WHERE id = $1', [empId]);
    if (employee.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Insert or update performance record
    const result = await pool.query(
      `INSERT INTO performance (
        employee_id, month, year,
        performance_percentage, updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (employee_id, month, year)
      DO UPDATE SET
        performance_percentage = EXCLUDED.performance_percentage,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [empId, monthNum, yearNum, perfPercent]
    );

    console.log('Performance saved successfully:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create/Update performance error:', error);
    console.error('Error details:', {
      code: error.code,
      detail: error.detail,
      message: error.message
    });
    
    if (error.code === '23505') {
      return res.status(400).json({ 
        message: 'Performance record already exists for this employee, month, and year' 
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({ 
        message: 'Invalid employee ID' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete performance record
export const deletePerformance = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM performance WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Performance record not found' });
    }

    res.json({ message: 'Performance record deleted successfully' });
  } catch (error) {
    console.error('Delete performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

