import { motion } from 'framer-motion'
import { Users, Briefcase, CalendarCheck, Calendar, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend)

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
          fetchUpcomingLeaves()
        ])
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }
    
    loadInitialData()
    
    // Set up auto-refresh for daily attendance data (every 30 seconds)
    const attendanceInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Auto-refreshing dashboard data...')
        refreshDashboardData()
      }
    }, 30000) // Refresh every 30 seconds
    
    // Expose refresh function globally for testing
    ;(window as any).refreshDashboard = async () => {
      console.log('🔄 Global refresh function called')
      await Promise.all([
        refreshDashboardData(),
        fetchUpcomingLeaves()
      ])
    }

    return () => {
      clearInterval(attendanceInterval)
    }
  }, [token, fetchUpcomingLeaves, refreshDashboardData])

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
        gradient: 'from-purple-500 to-pink-500',
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

  // Prepare chart data for Chart.js pie chart
  const pieChartData = useMemo(() => {
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
      backgroundColor.push('hsl(142, 71%, 45%)')
    }
    if (absentValue > 0) {
      labels.push('Absent')
      data.push(absentValue)
      backgroundColor.push('hsl(0, 84%, 60%)')
    }
    if (lateValue > 0) {
      labels.push('Late')
      data.push(lateValue)
      backgroundColor.push('hsl(45, 93%, 47%)')
    }
    if (onLeaveValue > 0) {
      labels.push('On Leave')
      data.push(onLeaveValue)
      backgroundColor.push('hsl(217, 91%, 60%)')
    }

    return {
      labels,
      datasets: [
        {
          label: 'Employees',
          data,
          backgroundColor,
          borderWidth: 2,
          borderColor: '#fff',
        },
      ],
    }
  }, [stats.todayPresent, stats.todayAbsent, stats.todayLate, stats.todayOnLeave, forceUpdate])

  const hasAttendanceData = useMemo(() => {
    return pieChartData.datasets[0].data.reduce((sum, val) => sum + val, 0) > 0
  }, [pieChartData])

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
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

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 gradient-text">Dashboard</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={`${stat.label}-${stat.value}-${forceUpdate}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              variant="glass" 
              className={`transition-all duration-300 ${
                stat.clickable 
                  ? 'cursor-pointer hover:scale-105 hover:shadow-lg' 
                  : 'hover:scale-105'
              }`}
              onClick={() => stat.clickable && handleStatClick(stat.status)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                  {stat.label}
                </CardTitle>
                <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-r ${stat.gradient} bg-opacity-20 flex-shrink-0`}>
                  <stat.icon className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  {loading ? (
                    <Skeleton className="h-10 w-20" />
                  ) : (
                    <span key={`value-${stat.value}-${forceUpdate}`} className="text-2xl sm:text-3xl font-bold">
                      {stat.value}
                    </span>
                  )}
                </div>
                {stat.clickable && (
                  <p className="text-xs text-muted-foreground mt-1">Click to refresh</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

 {/* Today's Attendance Pie Chart */}
 <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card variant="glass" className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={20} />
              Today's Attendance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {loading ? (
              <div className="h-[400px] flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
            ) : !hasAttendanceData ? (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <BarChart3 className="w-12 h-12 opacity-50" />
                <p className="text-sm font-medium">No attendance data for today</p>
                <p className="text-xs">Mark attendance to see the chart</p>
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <Pie data={pieChartData} options={chartOptions} />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Leaves Section */}
      {upcomingLeaves.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {leave.first_name?.[0]}{leave.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {leave.first_name} {leave.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {leave.leave_type} • {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {leave.leave_type}
                      </Badge>
                    </div>
                  ))}
                  {upcomingLeaves.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
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


