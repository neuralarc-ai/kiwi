import { pool } from '../config/database.js';

// Get all settings
export const getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM settings ORDER BY setting_key');
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
    const result = await pool.query('SELECT * FROM settings WHERE setting_key = $1', [key]);

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

    if (settings.length === 0) {
      return res.status(400).json({ message: 'Settings array cannot be empty' });
    }

    const results = [];

    for (const setting of settings) {
      const { key, value } = setting;

      if (!key) {
        console.warn('Skipping setting with missing key:', setting);
        continue;
      }

      // Convert value to string (allow empty strings, but convert to string)
      const stringValue = value !== null && value !== undefined ? String(value) : '';

      try {
      // Check if setting exists
        const existing = await pool.query('SELECT * FROM settings WHERE setting_key = $1', [key]);

      if (existing.rows.length > 0) {
        // Update existing setting
        const result = await pool.query(
            'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2 RETURNING *',
            [stringValue, key]
        );
        results.push(result.rows[0]);
      } else {
        // Create new setting
        const result = await pool.query(
            'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) RETURNING *',
            [key, stringValue]
        );
        results.push(result.rows[0]);
      }
      } catch (dbError) {
        console.error(`Error updating setting ${key}:`, dbError);
        console.error(`Database error details:`, dbError.message);
        console.error(`Stack trace:`, dbError.stack);
        // Continue with other settings even if one fails
        continue;
      }
    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'No settings were updated. Please check your input.' });
    }

    res.json({ message: 'Settings updated successfully', settings: results });
  } catch (error) {
    console.error('Update settings error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update single setting
export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ message: 'Value is required' });
    }

    // Convert value to string to ensure it's stored correctly
    const stringValue = String(value);

    // Check if setting exists
    const existing = await pool.query('SELECT * FROM settings WHERE setting_key = $1', [key]);

    if (existing.rows.length > 0) {
      // Update existing setting
      const result = await pool.query(
        'UPDATE settings SET setting_value = $1, updated_at = CURRENT_TIMESTAMP WHERE setting_key = $2 RETURNING *',
        [stringValue, key]
      );
      res.json(result.rows[0]);
    } else {
      // Create new setting
      const result = await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES ($1, $2) RETURNING *',
        [key, stringValue]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (error) {
    console.error('Update setting error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
