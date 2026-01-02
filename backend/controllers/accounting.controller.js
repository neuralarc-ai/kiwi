import { pool } from '../config/database.js'

// Get accounting data for a specific month and year
export const getAccountingData = async (req, res) => {
  try {
    const { month, year } = req.query

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' })
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid month' })
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ message: 'Invalid year' })
    }

    // Check if accounting_entries table exists, if not return empty array
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'accounting_entries'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      return res.json([])
    }

    // Fetch accounting entries for the specified month and year
    const result = await pool.query(
      `SELECT 
        id,
        head,
        subhead,
        tds_percentage as "tdsPercentage",
        gst_percentage as "gstPercentage",
        frequency,
        remarks,
        amount,
        entry_id as "entryId",
        month,
        year
      FROM accounting_entries
      WHERE month = $1 AND year = $2
      ORDER BY head, subhead`,
      [monthNum, yearNum]
    )

    // Ensure all amounts are numbers (PostgreSQL DECIMAL returns as string)
    const rows = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount) || 0,
      tdsPercentage: parseFloat(row.tdsPercentage) || 0,
      gstPercentage: parseFloat(row.gstPercentage) || 0,
    }))

    res.json(rows)
  } catch (error) {
    console.error('Get accounting data error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// Update accounting amount
export const updateAccountingAmount = async (req, res) => {
  try {
    const { id } = req.params
    const { amount, month, year } = req.body

    if (!amount && amount !== 0) {
      return res.status(400).json({ message: 'Amount is required' })
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum < 0) {
      return res.status(400).json({ message: 'Invalid amount' })
    }

    // Check if accounting_entries table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'accounting_entries'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({ message: 'Accounting entries table does not exist' })
    }

    // Update the amount
    const result = await pool.query(
      `UPDATE accounting_entries 
       SET amount = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND month = $3 AND year = $4
       RETURNING *`,
      [amountNum, id, month, year]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Accounting entry not found' })
    }

    res.json({
      message: 'Amount updated successfully',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Update accounting amount error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// Create a new accounting entry
export const createAccountingEntry = async (req, res) => {
  try {
    const { head, subhead, tdsPercentage, gstPercentage, frequency, remarks, amount, month, year } = req.body

    if (!head || !month || !year) {
      return res.status(400).json({ message: 'Head, month, and year are required' })
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid month' })
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ message: 'Invalid year' })
    }

    const amountNum = parseFloat(amount) || 0
    const tdsNum = parseFloat(tdsPercentage) || 0
    const gstNum = parseFloat(gstPercentage) || 0

    let result
    let isUpdate = false

    // For "Once" frequency entries, always create a new entry (allow multiple one-time entries)
    // For other frequencies (Monthly, Quarterly, Yearly), update if exists, create if not
    if (frequency === 'Once') {
      // Always insert new entry for "Once" frequency - allow multiple one-time entries
      // If unique constraint violation occurs, it means the constraint hasn't been updated yet
      // In that case, we'll add a timestamp to make it unique
      try {
        result = await pool.query(
          `INSERT INTO accounting_entries 
           (head, subhead, tds_percentage, gst_percentage, frequency, remarks, amount, month, year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING 
             id,
             head,
             subhead,
             tds_percentage as "tdsPercentage",
             gst_percentage as "gstPercentage",
             frequency,
             remarks,
             amount,
             entry_id as "entryId",
             month,
             year`,
          [
            head,
            subhead || null,
            tdsNum,
            gstNum,
            frequency || null,
            remarks || null,
            amountNum,
            monthNum,
            yearNum
          ]
        )
      } catch (insertError) {
        // If unique constraint violation for "Once" entry, modify subhead to make it unique
        if (insertError.code === '23505') {
          // Add timestamp to subhead to make it unique for "Once" entries
          const uniqueSubhead = subhead 
            ? `${subhead} - ${Date.now()}` 
            : `Entry ${Date.now()}`
          
          result = await pool.query(
            `INSERT INTO accounting_entries 
             (head, subhead, tds_percentage, gst_percentage, frequency, remarks, amount, month, year)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING 
               id,
               head,
               subhead,
               tds_percentage as "tdsPercentage",
               gst_percentage as "gstPercentage",
               frequency,
               remarks,
               amount,
               entry_id as "entryId",
               month,
               year`,
            [
              head,
              uniqueSubhead,
              tdsNum,
              gstNum,
              frequency || null,
              remarks || null,
              amountNum,
              monthNum,
              yearNum
            ]
          )
        } else {
          throw insertError
        }
      }
    } else {
      // For recurring entries (Monthly, Quarterly, Yearly), check if entry exists
      const existingCheck = await pool.query(
        'SELECT id FROM accounting_entries WHERE head = $1 AND COALESCE(subhead, \'\') = COALESCE($2, \'\') AND month = $3 AND year = $4',
        [head, subhead || null, monthNum, yearNum]
      )

      if (existingCheck.rows.length > 0) {
        // Update existing entry for recurring frequencies
        isUpdate = true
        result = await pool.query(
          `UPDATE accounting_entries 
           SET 
             tds_percentage = $1,
             gst_percentage = $2,
             frequency = $3,
             remarks = $4,
             amount = $5,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $6
           RETURNING 
             id,
             head,
             subhead,
             tds_percentage as "tdsPercentage",
             gst_percentage as "gstPercentage",
             frequency,
             remarks,
             amount,
             entry_id as "entryId",
             month,
             year`,
          [
            tdsNum,
            gstNum,
            frequency || null,
            remarks || null,
            amountNum,
            existingCheck.rows[0].id
          ]
        )
      } else {
        // Insert new entry for recurring frequencies
        result = await pool.query(
          `INSERT INTO accounting_entries 
           (head, subhead, tds_percentage, gst_percentage, frequency, remarks, amount, month, year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING 
             id,
             head,
             subhead,
             tds_percentage as "tdsPercentage",
             gst_percentage as "gstPercentage",
             frequency,
             remarks,
             amount,
             entry_id as "entryId",
             month,
             year`,
          [
            head,
            subhead || null,
            tdsNum,
            gstNum,
            frequency || null,
            remarks || null,
            amountNum,
            monthNum,
            yearNum
          ]
        )
      }
    }

    // Convert amounts to numbers
    const row = result.rows[0]
    row.amount = parseFloat(row.amount) || 0
    row.tdsPercentage = parseFloat(row.tdsPercentage) || 0
    row.gstPercentage = parseFloat(row.gstPercentage) || 0

    res.json({
      message: isUpdate 
        ? 'Accounting entry updated successfully' 
        : 'Accounting entry created successfully',
      data: row
    })
  } catch (error) {
    console.error('Create accounting entry error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// Initialize accounting entries for a month/year with default categories
export const initializeAccountingEntries = async (req, res) => {
  try {
    const { month, year } = req.body

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' })
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid month' })
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ message: 'Invalid year' })
    }

    // Check if entries already exist for this month/year
    const existingCheck = await pool.query(
      'SELECT COUNT(*) as count FROM accounting_entries WHERE month = $1 AND year = $2',
      [monthNum, yearNum]
    )

    if (parseInt(existingCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Accounting entries already exist for this month/year. Use update instead.' 
      })
    }

    // Default accounting heads with TDS and GST percentages
    const defaultEntries = [
      // 1. Salary & Compensation
      { head: 'Salary & Wages', subhead: null, tds: 10, gst: 0, frequency: 'Monthly', remarks: 'Employee salaries and wages' },
      
      // 2. Operating Expenses - Rent & Facilities
      { head: 'Rent', subhead: null, tds: 10, gst: 18, frequency: 'Monthly', remarks: 'Office rent' },
      { head: 'Utilities', subhead: null, tds: 10, gst: 18, frequency: 'Monthly', remarks: 'Electricity, water, internet' },
      { head: 'Office Expenses', subhead: null, tds: 10, gst: 18, frequency: 'Monthly', remarks: 'Office supplies and maintenance' },
      
      // 2. Operating Expenses - Professional Services
      { head: 'Professional Services', subhead: null, tds: 10, gst: 18, frequency: 'Monthly', remarks: 'Legal, consulting, audit services' },
      { head: 'Contractor Payments', subhead: null, tds: 10, gst: 18, frequency: 'Monthly', remarks: 'Freelancer and contractor payments' },
      
      // 2. Operating Expenses - Finance & Interest
      { head: 'Interest Paid', subhead: null, tds: 10, gst: 0, frequency: 'Monthly', remarks: 'Bank interest and loan interest' },
      
      // 2. Operating Expenses - Travel & Marketing
      { head: 'Travel & Conveyance', subhead: null, tds: 10, gst: 5, frequency: 'Monthly', remarks: 'Employee travel and transportation' },
      { head: 'Marketing & Advertising', subhead: null, tds: 10, gst: 18, frequency: 'Monthly', remarks: 'Marketing campaigns and advertising' },
      
      // 2. Operating Expenses - Insurance & Miscellaneous
      { head: 'Insurance', subhead: null, tds: 10, gst: 18, frequency: 'Monthly', remarks: 'Business insurance premiums' },
      { head: 'Miscellaneous Expenses', subhead: null, tds: 10, gst: 18, frequency: 'Monthly', remarks: 'Other operating expenses' },
      
      // 3. Tax & Compliance
      { head: 'TDS Payable', subhead: null, tds: 0, gst: 0, frequency: 'Monthly', remarks: 'Tax Deducted at Source payable' },
      { head: 'GST Payable', subhead: null, tds: 0, gst: 0, frequency: 'Monthly', remarks: 'Goods and Services Tax payable' },
    ]

    // Insert all entries
    const insertedEntries = []
    for (const entry of defaultEntries) {
      try {
        const result = await pool.query(
          `INSERT INTO accounting_entries 
           (head, subhead, tds_percentage, gst_percentage, frequency, remarks, amount, month, year)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING 
             id,
             head,
             subhead,
             tds_percentage as "tdsPercentage",
             gst_percentage as "gstPercentage",
             frequency,
             remarks,
             amount,
             entry_id as "entryId",
             month,
             year`,
          [
            entry.head,
            entry.subhead,
            entry.tds,
            entry.gst,
            entry.frequency,
            entry.remarks,
            0, // Default amount is 0
            monthNum,
            yearNum
          ]
        )
        insertedEntries.push(result.rows[0])
      } catch (insertError) {
        // Skip if entry already exists (due to UNIQUE constraint)
        if (insertError.code === '23505') {
          console.log(`Entry already exists: ${entry.head} - ${entry.subhead || 'N/A'}`)
          continue
        }
        throw insertError
      }
    }

    res.json({
      message: `Initialized ${insertedEntries.length} accounting entries for ${monthNum}/${yearNum}`,
      entries: insertedEntries
    })
  } catch (error) {
    console.error('Initialize accounting entries error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// Sync salary amount from payroll records
export const syncSalaryFromPayroll = async (req, res) => {
  try {
    const { month, year } = req.query

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' })
    }

    const monthNum = parseInt(month)
    const yearNum = parseInt(year)

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid month' })
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ message: 'Invalid year' })
    }

    // Calculate total paid salaries - use gross salary (basic_salary + allowances) for accounting
    // This represents the total cost to the company, not net salary after deductions
    const payrollResult = await pool.query(
      `SELECT COALESCE(SUM(basic_salary + allowances), 0) as total_salary
       FROM payroll
       WHERE month = $1 AND year = $2 
       AND status = 'paid'
       AND (basic_salary + allowances) > 0`,
      [monthNum, yearNum]
    )
    
    const totalSalary = parseFloat(payrollResult.rows[0].total_salary) || 0
    console.log(`📊 Syncing salary for ${monthNum}/${yearNum}: Found ₹${totalSalary} in paid salaries (gross: basic + allowances)`)

    // Check if accounting_entries table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'accounting_entries'
      )
    `)

    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({ message: 'Accounting entries table does not exist' })
    }

    // Find or create "Salary & Wages" entry
    let salaryEntry = await pool.query(
      `SELECT id FROM accounting_entries 
       WHERE head = 'Salary & Wages' AND month = $1 AND year = $2`,
      [monthNum, yearNum]
    )

    if (salaryEntry.rows.length === 0) {
      // Create the entry if it doesn't exist
      const createResult = await pool.query(
        `INSERT INTO accounting_entries 
         (head, subhead, tds_percentage, gst_percentage, frequency, remarks, amount, month, year)
         VALUES ('Salary & Wages', NULL, 10, 0, 'Monthly', 'Employee salaries and wages (Auto-synced from payroll)', $1, $2, $3)
         RETURNING id, amount`,
        [totalSalary, monthNum, yearNum]
      )
      salaryEntry = createResult
    } else {
      // Update existing entry
      const updateResult = await pool.query(
        `UPDATE accounting_entries 
         SET amount = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING amount`,
        [totalSalary, salaryEntry.rows[0].id]
      )
      console.log(`✅ Updated salary entry (ID: ${salaryEntry.rows[0].id}) to ₹${totalSalary}`)
    }

    res.json({
      message: 'Salary amount synced successfully',
      totalPaidSalaries: totalSalary,
      entryId: salaryEntry.rows[0].id,
      month: monthNum,
      year: yearNum
    })
  } catch (error) {
    console.error('Sync salary from payroll error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

