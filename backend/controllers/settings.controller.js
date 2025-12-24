import { pool } from '../config/database.js';

// Get all settings
export const getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY key');
    res.json(result.rows);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get single setting by key
export const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query('SELECT * FROM settings WHERE key = $1', [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update multiple settings
export const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body; // Array of {key, value} objects

    if (!Array.isArray(settings)) {
      return res.status(400).json({ message: 'Settings must be an array' });
    }

    const results = [];

    for (const setting of settings) {
      const { key, value } = setting;

      if (!key) {
        continue;
      }

      // Check if setting exists
      const existing = await pool.query('SELECT * FROM settings WHERE key = $1', [key]);

      if (existing.rows.length > 0) {
        // Update existing setting
        const result = await pool.query(
          'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2 RETURNING *',
          [value, key]
        );
        results.push(result.rows[0]);
      } else {
        // Create new setting
        const result = await pool.query(
          'INSERT INTO settings (key, value) VALUES ($1, $2) RETURNING *',
          [key, value]
        );
        results.push(result.rows[0]);
      }
    }

    res.json({ message: 'Settings updated successfully', settings: results });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update single setting
export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ message: 'Value is required' });
    }

    // Check if setting exists
    const existing = await pool.query('SELECT * FROM settings WHERE key = $1', [key]);

    if (existing.rows.length > 0) {
      // Update existing setting
      const result = await pool.query(
        'UPDATE settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2 RETURNING *',
        [value, key]
      );
      res.json(result.rows[0]);
    } else {
      // Create new setting
      const result = await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) RETURNING *',
        [key, value]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
