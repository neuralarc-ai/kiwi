import { pool } from '../config/database.js';

export const getActivities = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await pool.query(
      `SELECT a.*, u.email as user_email, 
              e.first_name as employee_first_name, e.last_name as employee_last_name
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN employees e ON a.employee_id = e.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createActivity = async (type, description, userId, employeeId, metadata = {}) => {
  try {
    await pool.query(
      `INSERT INTO activities (type, description, user_id, employee_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [type, description, userId, employeeId, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error('Create activity error:', error);
  }
};


