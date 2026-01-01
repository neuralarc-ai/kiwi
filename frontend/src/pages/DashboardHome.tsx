import { motion } from 'framer-motion'
import { Users, Briefcase, CalendarCheck, Calendar, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Filler
)

interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  onLeave: number
  activeJobPostings: number
  todayPresent?: number
  todayAbsent?: number
  todayLate?: number
  todayOnLeave?: number
}

interface UpcomingLeave {
  id: number
  employee_id: number
  first_name: string
  last_name: string
  emp_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
}

export default function DashboardHome() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    onLeave: 0,
    activeJobPostings: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLate: 0,
    todayOnLeave: 0
  })
  const [upcomingLeaves, setUpcomingLeaves] = useState<UpcomingLeave[]>([])
  const [loadingLeaves, setLoadingLeaves] = useState(true)
  const [forceUpdate, setForceUpdate] = useState(0) // Force component re-render
  const [monthlyAttendanceTrend, setMonthlyAttendanceTrend] = useState<{
    months: string[]
    present: number[]
    absent: number[]
    late: number[]
    onLeave: number[]
  }>({
    months: [],
    present: [],
    absent: [],
    late: [],
    onLeave: []
  })
  const [loadingTrend, setLoadingTrend] = useState(false)

  const fetchUpcomingLeaves = useCallback(async () => {
    if (!token) return

    try {
      setLoadingLeaves(true)
      const leaves = await apiService.getUpcomingLeaves(token)
      setUpcomingLeaves(leaves || [])
    } catch (error) {
      console.error('Error fetching upcoming leaves:', error)
    } finally {
      setLoadingLeaves(false)
    }
  }, [token])

  const fetchMonthlyAttendanceTrend = useCallback(async () => {
    if (!token) return

    try {
      setLoadingTrend(true)
      const months: string[] = []
      const present: number[] = []
      const absent: number[] = []
      const late: number[] = []
      const onLeave: number[] = []

      // Get last 6 months of data in chronological order (oldest to newest)
      // Start from 5 months ago and go to current month
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() // 0-indexed (0 = January)
      
      for (let i = 5; i >= 0; i--) {
        // Calculate target month and year properly
        let targetMonth = currentMonth - i
        let targetYear = currentYear
        
        // Handle year rollover
        while (targetMonth < 0) {
          targetMonth += 12
          targetYear -= 1
        }
        
        const month = targetMonth + 1 // Convert to 1-indexed (1 = January)
        const year = targetYear
        
        // Create date for label formatting
        const targetDate = new Date(year, targetMonth, 1)

        try {
          // Fetch monthly attendance data
          const attendanceData = await apiService.getMonthlyAttendance(token, year, month)
          
          // Count attendance by status
          const presentCount = attendanceData.filter((a: any) => a.status === 'present').length
          const absentCount = attendanceData.filter((a: any) => a.status === 'absent').length
          const lateCount = attendanceData.filter((a: any) => a.status === 'late').length
          const onLeaveCount = attendanceData.filter((a: any) => a.status === 'on_leave').length

          // Format month label (short month name, only show year if different from current year)
          const currentYear = new Date().getFullYear()
          const monthLabel = targetDate.getFullYear() !== currentYear
            ? targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : targetDate.toLocaleDateString('en-US', { month: 'short' })
          
          months.push(monthLabel)
          present.push(presentCount)
          absent.push(absentCount)
          late.push(lateCount)
          onLeave.push(onLeaveCount)
        } catch (error) {
          console.error(`Error fetching attendance for ${month}/${year}:`, error)
          // Add zeros if data fetch fails
          const currentYear = new Date().getFullYear()
          const monthLabel = targetDate.getFullYear() !== currentYear
            ? targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : targetDate.toLocaleDateString('en-US', { month: 'short' })
          months.push(monthLabel)
          present.push(0)
          absent.push(0)
          late.push(0)
          onLeave.push(0)
        }
      }

      console.log('📊 Monthly attendance trend data (chronological order):', { 
        months, 
        present, 
        absent, 
        late, 
        onLeave 
      })
      setMonthlyAttendanceTrend({ months, present, absent, late, onLeave })
    } catch (error) {
      console.error('Error fetching monthly attendance trend:', error)
    } finally {
      setLoadingTrend(false)
    }
  }, [token])

  const refreshDashboardData = useCallback(async () => {
    if (!token) {
      console.log('⚠️ No token available for dashboard stats')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      console.log('📊 Fetching dashboard stats...')
      const data = await apiService.getDashboardStats(token) as DashboardStats
      console.log('✅ Dashboard stats received:', data)
      console.log('📊 Today stats from API:', {
        todayPresent: data.todayPresent,
        todayAbsent: data.todayAbsent,
        todayLate: data.todayLate,
        todayOnLeave: data.todayOnLeave
      })
      
      // Ensure data is properly structured
      if (data && typeof data === 'object') {
        setStats(prev => {
          const newStats: DashboardStats = {
            totalEmployees: data.totalEmployees || 0,
            activeEmployees: data.activeEmployees || 0,
            onLeave: data.onLeave || 0,
            activeJobPostings: data.activeJobPostings || 0,
            todayPresent: data.todayPresent ?? prev.todayPresent ?? 0,
            todayAbsent: data.todayAbsent ?? prev.todayAbsent ?? 0,
            todayLate: data.todayLate ?? prev.todayLate ?? 0,
            todayOnLeave: data.todayOnLeave ?? prev.todayOnLeave ?? 0
          }
          console.log('🔄 Setting new stats state:', newStats)
          return newStats
        })
      } else {
        console.warn('⚠️ Invalid data structure received:', data)
      }
    } catch (error: any) {
      console.error('❌ Error fetching dashboard stats:', error)
      setError(error?.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    // Initial load
    const loadInitialData = async () => {
      try {
        await Promise.all([
          refreshDashboardData(),
          fetchUpcomingLeaves(),
          fetchMonthlyAttendanceTrend()
        ])
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }
    
    loadInitialData()
    
    // Expose refresh function globally for testing
    ;(window as any).refreshDashboard = async () => {
      console.log('🔄 Global refresh function called')
      await Promise.all([
        refreshDashboardData(),
        fetchUpcomingLeaves()
      ])
    }
  }, [token, fetchUpcomingLeaves, refreshDashboardData, fetchMonthlyAttendanceTrend])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Memoize stat cards to ensure they update when stats change
  const statCards = useMemo(() => {
    const presentValue = stats.todayPresent ?? 0
    const absentValue = stats.todayAbsent ?? 0
    const lateValue = stats.todayLate ?? 0
    const onLeaveValue = stats.todayOnLeave ?? 0
    
    const cards = [
      {
        label: 'Total Employees',
        value: stats.totalEmployees,
        icon: Users,
        gradient: 'from-blue-500 to-cyan-500',
        clickable: false
      },
      {
        label: 'Present',
        value: presentValue,
        icon: Users,
        gradient: 'from-green-500 to-emerald-500',
        clickable: true,
        status: 'present'
      },
      {
        label: 'Absent',
        value: absentValue,
        icon: Users,
        gradient: 'from-red-500 to-rose-500',
        clickable: true,
        status: 'absent'
      },
      {
        label: 'Late',
        value: lateValue,
        icon: CalendarCheck,
        gradient: 'from-yellow-500 to-amber-500',
        clickable: true,
        status: 'late'
      },
      {
        label: 'On Leave',
        value: onLeaveValue,
        icon: CalendarCheck,
        gradient: 'from-orange-500 to-red-500',
        clickable: true,
        status: 'on_leave'
      },
      {
        label: 'Active Jobs',
        value: stats.activeJobPostings,
        icon: Briefcase,
        gradient: 'from-gray-300 to-gray-400',
        clickable: false
      }
    ]
    console.log('📊 Stat cards recalculated:', cards.map(c => `${c.label}: ${c.value}`))
    console.log('📊 Using API stats:', {
      present: presentValue,
      absent: absentValue,
      late: lateValue,
      onLeave: onLeaveValue
    })
    return cards
  }, [
    stats.totalEmployees, 
    stats.activeJobPostings, 
    stats.todayPresent, 
    stats.todayAbsent, 
    stats.todayLate, 
    stats.todayOnLeave,
    forceUpdate
  ])

  const handleStatClick = (status: string | undefined) => {
    // Refresh data when clicking on stat cards to ensure latest data
    if (status) {
      console.log(`🔄 Stat card clicked: ${status}, refreshing data...`)
      // Refresh dashboard stats
      refreshDashboardData().then(() => {
        console.log('✅ Data refreshed after stat card click')
        // Force UI update after data is refreshed
        setTimeout(() => {
          setForceUpdate(prev => prev + 1)
        }, 200)
      })
    }
  }

  // Prepare chart data for Chart.js doughnut chart (same format as example)
  const doughnutChartData = useMemo(() => {
    const presentValue = Number(stats.todayPresent ?? 0) || 0
    const absentValue = Number(stats.todayAbsent ?? 0) || 0
    const lateValue = Number(stats.todayLate ?? 0) || 0
    const onLeaveValue = Number(stats.todayOnLeave ?? 0) || 0

    const labels: string[] = []
    const data: number[] = []
    const backgroundColor: string[] = []

    if (presentValue > 0) {
      labels.push('Present')
      data.push(presentValue)
      backgroundColor.push('rgb(144, 238, 144)') // Light green
    }
    if (absentValue > 0) {
      labels.push('Absent')
      data.push(absentValue)
      backgroundColor.push('rgb(255, 182, 193)') // Light pink
    }
    if (lateValue > 0) {
      labels.push('Late')
      data.push(lateValue)
      backgroundColor.push('rgb(255, 228, 181)') // Light orange
    }
    if (onLeaveValue > 0) {
      labels.push('On Leave')
      data.push(onLeaveValue)
      backgroundColor.push('rgb(173, 216, 230)') // Light blue
    }

    // Chart.js format - exactly matching the example structure
    const chartData = {
      labels: labels,
      datasets: [{
        label: 'My First Dataset',
        data: data,
        backgroundColor: backgroundColor,
        hoverOffset: 4
      }]
    }

    return chartData
  }, [stats.todayPresent, stats.todayAbsent, stats.todayLate, stats.todayOnLeave, forceUpdate])

  const hasAttendanceData = useMemo(() => {
    return doughnutChartData.datasets[0].data.reduce((sum, val) => sum + val, 0) > 0
  }, [doughnutChartData])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 14,
          },
        },
      },
      tooltip: {
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context: any) {
            const label = context.label || ''
            const value = context.parsed || 0
            return `${label}: ${value} employee${value !== 1 ? 's' : ''}`
          },
        },
      },
    },
  }

  // Monthly Attendance Trend Line Chart Data - Chart.js format (same as example)
  const lineChartData = useMemo(() => {
    // Use the months from the fetched data - they are already in chronological order
    let labels: string[] = []
    
    if (monthlyAttendanceTrend.months.length > 0) {
      // Use the actual months from the fetched data (already in chronological order)
      labels = [...monthlyAttendanceTrend.months]
    } else {
      // Generate month labels for last 6 months (fallback) in chronological order
      for (let i = 5; i >= 0; i--) {
        const currentDate = new Date()
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const currentYear = new Date().getFullYear()
        const monthLabel = targetDate.getFullYear() !== currentYear
          ? targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : targetDate.toLocaleDateString('en-US', { month: 'short' })
        labels.push(monthLabel)
      }
    }
    
    // Ensure data arrays match labels length and are in correct order
    const dataLength = labels.length || 6
    const presentData = monthlyAttendanceTrend.present.length === dataLength
      ? [...monthlyAttendanceTrend.present]
      : monthlyAttendanceTrend.present.length > 0 
        ? [...monthlyAttendanceTrend.present]
        : new Array(dataLength).fill(0)
    const absentData = monthlyAttendanceTrend.absent.length === dataLength
      ? [...monthlyAttendanceTrend.absent]
      : monthlyAttendanceTrend.absent.length > 0 
        ? [...monthlyAttendanceTrend.absent]
        : new Array(dataLength).fill(0)
    const lateData = monthlyAttendanceTrend.late.length === dataLength
      ? [...monthlyAttendanceTrend.late]
      : monthlyAttendanceTrend.late.length > 0 
        ? [...monthlyAttendanceTrend.late]
        : new Array(dataLength).fill(0)
    const onLeaveData = monthlyAttendanceTrend.onLeave.length === dataLength
      ? [...monthlyAttendanceTrend.onLeave]
      : monthlyAttendanceTrend.onLeave.length > 0 
        ? [...monthlyAttendanceTrend.onLeave]
        : new Array(dataLength).fill(0)
    
    // Chart.js format - Zigzag format with sharp angles
    const data = {
      labels: labels,
      datasets: [
        {
          label: 'Present',
          data: presentData,
          fill: false,
          borderColor: 'rgb(34, 197, 94)',
          tension: 0, // Zero tension for sharp zigzag lines
        },
        {
          label: 'Absent',
          data: absentData,
          fill: false,
          borderColor: 'rgb(239, 68, 68)',
          tension: 0, // Zero tension for sharp zigzag lines
        },
        {
          label: 'Late',
          data: lateData,
          fill: false,
          borderColor: 'rgb(234, 179, 8)',
          tension: 0, // Zero tension for sharp zigzag lines
        },
        {
          label: 'On Leave',
          data: onLeaveData,
          fill: false,
          borderColor: 'rgb(59, 130, 246)',
          tension: 0, // Zero tension for sharp zigzag lines
        },
      ],
    }
    
    return data
  }, [monthlyAttendanceTrend])

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 14,
          },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || ''
            const value = context.parsed.y || 0
            return `${label}: ${value} employee${value !== 1 ? 's' : ''}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false, // Show all labels
        },
        title: {
          display: true,
          text: 'Month',
          font: {
            size: 14,
          },
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          font: {
            size: 13,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 gradient-text">Dashboard</h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-base"
        >
          {error}
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={`${stat.label}-${stat.value}-${forceUpdate}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              variant="glass" 
              className={`h-full flex flex-col transition-all duration-300 ${
                stat.clickable 
                  ? 'cursor-pointer hover:scale-105 hover:shadow-lg' 
                  : 'hover:scale-105'
              }`}
              onClick={() => stat.clickable && handleStatClick(stat.status)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 flex-shrink-0 gap-2">
                <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground flex-1 min-w-0 break-words">
                  {stat.label}
                </CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-r ${stat.gradient} bg-opacity-20 flex-shrink-0`}>
                  <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    stat.label.includes('Present') || stat.label.includes('Total') ? 'text-green-400' :
                    stat.label.includes('Absent') ? 'text-red-400' :
                    stat.label.includes('Late') ? 'text-yellow-400' :
                    stat.label.includes('Leave') ? 'text-black dark:text-white' :
                    stat.label.includes('Jobs') ? 'text-black dark:text-white' :
                    'text-black dark:text-white'
                  }`} />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center pt-0">
                <div className="flex items-baseline">
                  {loading ? (
                    <Skeleton className="h-10 w-20" />
                  ) : (
                    <span key={`value-${stat.value}-${forceUpdate}`} className="text-xl sm:text-2xl font-bold">
                      {stat.value}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid - Doughnut Chart and Line Chart Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Today's Attendance Doughnut Chart */}
 <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card variant="glass" className="flex flex-col">
          <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 size={20} />
              Today's Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
            ) : !hasAttendanceData ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <BarChart3 className="w-12 h-12 opacity-50" />
                  <p className="text-base font-medium">No attendance data for today</p>
                  <p className="text-sm">Mark attendance to see the chart</p>
              </div>
            ) : (
                <div className="h-[300px] w-full">
                  <Doughnut data={doughnutChartData} options={chartOptions} />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

        {/* Monthly Attendance Trend Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card variant="glass" className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <BarChart3 size={20} />
                Monthly Attendance Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              {loadingTrend ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-md" />
                </div>
              ) : monthlyAttendanceTrend.months.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
                  <BarChart3 className="w-12 h-12 opacity-50" />
                  <p className="text-base font-medium">No attendance trend data available</p>
                  <p className="text-sm">Attendance data will appear here once available</p>
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <Line data={lineChartData} options={lineChartOptions} />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Leaves Section */}
      {upcomingLeaves.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Calendar size={20} />
                Upcoming Leaves
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLeaves ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingLeaves.slice(0, 5).map((leave) => (
                    <div
                      key={leave.id}
                      className="flex items-center justify-between p-3 rounded-lg glass hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-sm">
                          {leave.first_name?.[0]}{leave.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-base font-semibold">
                            {leave.first_name} {leave.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {leave.leave_type} • {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize text-sm">
                        {leave.leave_type}
                      </Badge>
                    </div>
                  ))}
                  {upcomingLeaves.length > 5 && (
                    <p className="text-base text-muted-foreground text-center pt-2">
                      +{upcomingLeaves.length - 5} more upcoming leaves
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

     
    </div>
  )
}


