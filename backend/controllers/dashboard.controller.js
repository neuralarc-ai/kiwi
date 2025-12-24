import { pool } from '../config/database.js';

export const getDashboardStats = async (req, res) => {
  try {
    console.log('📊 Dashboard stats controller called');

    // Get total employees count
    let totalEmployees = 0;
    try {
      const totalEmployeesResult = await pool.query('SELECT COUNT(*) as count FROM employees');
      totalEmployees = parseInt(totalEmployeesResult.rows[0]?.count) || 0;
      console.log(`  - Total employees: ${totalEmployees}`);
    } catch (err) {
      console.error('  - Error getting total employees:', err.message);
    }

    // Get active employees count (assuming all employees are active if no status column)
    let activeEmployees = 0;
    try {
      const activeEmployeesResult = await pool.query('SELECT COUNT(*) as count FROM employees');
      activeEmployees = parseInt(activeEmployeesResult.rows[0]?.count) || 0;
      console.log(`  - Active employees: ${activeEmployees}`);
    } catch (err) {
      console.error('  - Error getting active employees:', err.message);
      activeEmployees = totalEmployees; // Fallback to total employees
    }

    // Get today's attendance counts
    let todayPresent = 0;
    let todayAbsent = 0;
    let todayLate = 0;
    let todayOnLeave = 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's attendance counts
      const attendanceCountsResult = await pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'present') as present,
          COUNT(*) FILTER (WHERE status = 'absent') as absent,
          COUNT(*) FILTER (WHERE status = 'late') as late,
          COUNT(*) FILTER (WHERE status = 'on_leave') as on_leave
        FROM attendance
        WHERE date = $1`,
        [today]
      );
      
      if (attendanceCountsResult.rows.length > 0) {
        todayPresent = parseInt(attendanceCountsResult.rows[0].present) || 0;
        todayAbsent = parseInt(attendanceCountsResult.rows[0].absent) || 0;
        todayLate = parseInt(attendanceCountsResult.rows[0].late) || 0;
        todayOnLeave = parseInt(attendanceCountsResult.rows[0].on_leave) || 0;
      }
      
      console.log(`  - Today's attendance - Present: ${todayPresent}, Absent: ${todayAbsent}, Late: ${todayLate}, On Leave: ${todayOnLeave}`);
    } catch (err) {
      console.error('  - Error getting today\'s attendance counts:', err.message);
    }

    // Get employees on leave (from leaves table + attendance table marked as on_leave)
    let onLeave = 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get unique employee IDs from both sources
      const onLeaveResult = await pool.query(
        `SELECT COUNT(DISTINCT employee_id) as count
         FROM (
           SELECT employee_id 
           FROM leaves 
           WHERE status IN ('pending', 'approved') 
           AND start_date <= $1 
           AND end_date >= $1
           UNION
           SELECT employee_id 
           FROM attendance 
           WHERE date = $1 
           AND status = 'on_leave'
         ) combined`,
        [today]
      );
      onLeave = parseInt(onLeaveResult.rows[0]?.count) || 0;
      console.log(`  - On leave: ${onLeave}`);
    } catch (err) {
      console.error('  - Error getting on leave count:', err.message);
      // If tables don't exist, return 0
    }

    // Get active job postings count
    let activeJobPostings = 0;
    try {
      const activeJobPostingsResult = await pool.query(
        "SELECT COUNT(*) as count FROM job_postings WHERE status = 'active'"
      );
      activeJobPostings = parseInt(activeJobPostingsResult.rows[0]?.count) || 0;
      console.log(`  - Active job postings: ${activeJobPostings}`);
    } catch (err) {
      console.error('  - Error getting active job postings:', err.message);
      // If job_postings table doesn't exist, return 0
    }

    const stats = {
      totalEmployees,
      activeEmployees,
      onLeave,
      activeJobPostings,
      // Today's attendance counts for real-time updates
      todayPresent,
      todayAbsent,
      todayLate,
      todayOnLeave,
    };

    console.log('📊 Dashboard stats response:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Get dashboard stats error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stats: {
        totalEmployees: 0,
        activeEmployees: 0,
        onLeave: 0,
        activeJobPostings: 0
      }
    });
  }
};

// Get daily attendance stats for graph (last 7 days)
export const getDailyAttendanceStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysCount = parseInt(days) || 7;
    
    // Get date range - ensure today is always included
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (daysCount - 1)); // Include today + (daysCount-1) previous days
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`📊 Fetching attendance stats from ${startDateStr} to ${endDateStr}`);
    
    const result = await pool.query(
      `SELECT 
        date,
        COUNT(*) FILTER (WHERE status = 'present') as present,
        COUNT(*) FILTER (WHERE status = 'absent') as absent,
        COUNT(*) FILTER (WHERE status = 'late') as late,
        COUNT(*) FILTER (WHERE status = 'on_leave') as on_leave
      FROM attendance
      WHERE date >= $1 AND date <= $2
      GROUP BY date
      ORDER BY date ASC`,
      [startDateStr, endDateStr]
    );
    
    console.log(`📊 Found ${result.rows.length} days with attendance data`);

    // Fill in missing dates with zeros
    const dateMap = new Map();
    result.rows.forEach(row => {
      dateMap.set(row.date, {
        date: row.date,
        present: parseInt(row.present) || 0,
        absent: parseInt(row.absent) || 0,
        late: parseInt(row.late) || 0,
        on_leave: parseInt(row.on_leave) || 0
      });
    });

    // Generate all dates in range
    const allDates = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: dateStr,
          present: 0,
          absent: 0,
          late: 0,
          on_leave: 0
        });
      }
      allDates.push(dateStr);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const formattedData = allDates.map(date => dateMap.get(date));

    res.json(formattedData);
  } catch (error) {
    console.error('Get daily attendance stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
