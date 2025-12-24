import { pool } from '../config/database.js';

// Get all job postings
export const getJobPostings = async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM job_postings';
    const params = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get job postings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single job posting
export const getJobPosting = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM job_postings WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get job posting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create job posting (Admin/HR Executive only)
export const createJobPosting = async (req, res) => {
  try {
    const {
      title,
      department,
      position_type,
      location,
      description,
      requirements,
      salary_range,
      application_deadline,
      status,
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Job title is required' });
    }

    const result = await pool.query(
      `INSERT INTO job_postings (
        title, department, position_type, location, description, 
        requirements, salary_range, application_deadline, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *`,
      [
        title,
        department || null,
        position_type || 'full_time',
        location || 'office',
        description || null,
        requirements || null,
        salary_range || null,
        application_deadline || null,
        status || 'active',
        req.user.id,
      ]
    );

    const jobPosting = result.rows[0];

    res.status(201).json(jobPosting);
  } catch (error) {
    console.error('Create job posting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update job posting (Admin/HR Executive only)
export const updateJobPosting = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      department,
      position_type,
      location,
      description,
      requirements,
      salary_range,
      application_deadline,
      status,
    } = req.body;

    // Check if job posting exists
    const existing = await pool.query('SELECT * FROM job_postings WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    const result = await pool.query(
      `UPDATE job_postings SET 
        title = COALESCE($1, title),
        department = COALESCE($2, department),
        position_type = COALESCE($3, position_type),
        location = COALESCE($4, location),
        description = COALESCE($5, description),
        requirements = COALESCE($6, requirements),
        salary_range = COALESCE($7, salary_range),
        application_deadline = COALESCE($8, application_deadline),
        status = COALESCE($9, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 
      RETURNING *`,
      [title, department, position_type, location, description, requirements, salary_range, application_deadline, status, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update job posting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete job posting (Admin only)
export const deleteJobPosting = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM job_postings WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    res.json({ message: 'Job posting deleted successfully' });
  } catch (error) {
    console.error('Delete job posting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update application count
export const updateApplicationCount = async (req, res) => {
  try {
    const { id } = req.params;
    const { increment = true } = req.body;

    const result = await pool.query(
      `UPDATE job_postings 
       SET total_applications = total_applications ${increment ? '+' : '-'} 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Job posting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update application count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

