import { motion } from 'framer-motion'
import { Users, Briefcase, CalendarCheck, Calendar, BarChart3, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend
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

interface UpcomingEvent {
  id: number
  title: string
  subtitle: string
  date: string
  time: string
  type: 'bill' | 'salary' | 'leave' | 'meeting' | 'other'
}

// 6-Month Attendance Timeline Component
function SixMonthAttendanceTimeline({ 
  monthlyData,
  loading 
}: { 
  monthlyData: {
    months: string[]
    present: number[]
    absent: number[]
    late: number[]
    onLeave: number[]
  }
  loading: boolean
}) {
  const statusTypes = [
    { label: 'Present', key: 'present', color: 'bg-green-500' },
    { label: 'Absent', key: 'absent', color: 'bg-red-500' },
    { label: 'Late', key: 'late', color: 'bg-yellow-500' },
    { label: 'On Leave', key: 'onLeave', color: 'bg-blue-500' }
  ]

  const getMaxValue = () => {
    const allValues = [
      ...monthlyData.present,
      ...monthlyData.absent,
      ...monthlyData.late,
      ...monthlyData.onLeave
    ]
    return Math.max(...allValues, 1)
  }

  const maxValue = getMaxValue()

  const getStatusDotColor = (monthIndex: number) => {
    const present = monthlyData.present[monthIndex] || 0
    const absent = monthlyData.absent[monthIndex] || 0
    const late = monthlyData.late[monthIndex] || 0
    const onLeave = monthlyData.onLeave[monthIndex] || 0
    
    if (present > 0) return 'bg-green-500'
    if (absent > 0) return 'bg-red-500'
    if (late > 0) return 'bg-yellow-500'
    if (onLeave > 0) return 'bg-blue-500'
    return 'bg-gray-400'
  }

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Skeleton className="h-full w-full rounded-md" />
      </div>
    )
  }

  if (monthlyData.months.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
        <BarChart3 className="w-12 h-12 opacity-50" />
        <p className="text-base font-medium">No attendance trend data available</p>
        <p className="text-sm">Attendance data will appear here once available</p>
      </div>
    )
  }

  return (
    <div className="h-[300px] flex flex-col w-full">
      {/* Timeline Grid */}
      <div className="flex-1 w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="w-full h-full">
          {/* Months Header */}
          <div className="grid grid-cols-7 gap-0 border-b border-gray-200 dark:border-gray-700 h-10">
            <div className="p-1 text-[10px] font-medium text-muted-foreground flex items-center justify-center">Status</div>
            {monthlyData.months.map((month, index) => {
              const dotColor = getStatusDotColor(index)
              const isCurrentMonth = index === monthlyData.months.length - 1
              
              return (
                <div
                  key={index}
                  className={`p-1 text-center border-l border-gray-200 dark:border-gray-700 flex items-center justify-center ${
                    isCurrentMonth
                      ? 'bg-orange-100 dark:bg-orange-900/20'
                      : ''
                  }`}
                >
                  {isCurrentMonth ? (
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold text-[9px]">
                      {month.substring(0, 2)}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="text-[10px] font-medium">{month.substring(0, 3)}</span>
                      {dotColor && (
                        <span className={`w-1 h-1 rounded-full ${dotColor}`} />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Status Rows */}
          <div className="space-y-0 h-[calc(100%-2.5rem)]">
            {statusTypes.map((status, statusIndex) => (
              <div key={statusIndex} className="grid grid-cols-7 gap-0 border-b border-gray-200 dark:border-gray-700 last:border-b-0 h-1/4">
                {/* Status Label */}
                <div className="p-1 text-[10px] text-muted-foreground border-r border-gray-200 dark:border-gray-700 font-medium flex items-center justify-center">
                  {status.label}
                </div>

                {/* Month Cells */}
                {monthlyData.months.map((month, monthIndex) => {
                  const count = monthlyData[status.key as keyof typeof monthlyData][monthIndex] as number || 0
                  const hasData = count > 0
                  const heightPercentage = maxValue > 0 ? (count / maxValue) * 100 : 0
                  const isCurrentMonth = monthIndex === monthlyData.months.length - 1

                  return (
                    <div
                      key={monthIndex}
                      className={`border-r border-gray-200 dark:border-gray-700 p-0.5 flex items-end ${
                        isCurrentMonth ? 'bg-orange-50 dark:bg-orange-900/10' : ''
                      }`}
                    >
                      {hasData && (
                        <div
                          className={`${status.color} text-white text-[9px] px-0.5 py-0.5 rounded w-full flex items-center justify-center font-medium shadow-sm`}
                          style={{ height: `${Math.max(heightPercentage, 12)}%`, minHeight: '18px' }}
                          title={`${status.label}: ${count}`}
                        >
                          {count}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-green-500"></div>
          <span className="text-[9px] text-muted-foreground">Small note</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-purple-500"></div>
          <span className="text-[9px] text-muted-foreground">Small note</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-1 h-1 rounded-full bg-gray-400"></div>
          <span className="text-[9px] text-muted-foreground">Small note</span>
        </div>
      </div>
    </div>
  )
}

// Upcoming Events Component
function UpcomingEvents({ events, loading }: { events: UpcomingEvent[], loading: boolean }) {
  const handleEventClick = (event: UpcomingEvent) => {
    // Handle event click - you can navigate or show details
    console.log('Event clicked:', event)
    // Add your navigation or modal logic here
    // Example: navigate(`/events/${event.id}`) or open a modal
  }

  const getDateInfo = (dateString: string) => {
    const date = new Date(dateString)
    const dayAbbr = date.toLocaleDateString('en-US', { weekday: 'short' })
    const dayNumber = date.getDate()
    return { dayAbbr, dayNumber }
  }

  const getColorScheme = (index: number, type: string) => {
    // Color palette from design
    const colors = {
      redPassion: '#E0693D',      // First item background
      quantumCore: '#262626',     // Dark gray
      solarPulse: '#E7B31B',      // Golden yellow
      coreReactor: '#E0693D',      // Same as Red Passion
      auroraNode: '#EFB25E',      // Light orange/amber
      dataflowBlue: '#A6C8D5',    // Light blue
      neuralDrift: '#A69CBE',     // Lavender/purple
      ionSpark: '#EFB3AF',        // Light pink
      verdantCode: '#27584F',     // Dark teal/green
      ionMist: '#EFB3AF'          // Same as Ion Spark
    }

    if (index === 0) {
      // First item - Red Passion background
      return {
        container: colors.redPassion,
        dateBg: colors.redPassion,
        text: '#FFFFFF',
        badge: colors.ionSpark,
        textColor: '#FFFFFF'
      }
    }
    
    // Other items - colored date blocks
    const dateColors = [
      { dateBg: colors.auroraNode, text: colors.quantumCore },      // Aurora Node
      { dateBg: colors.dataflowBlue, text: colors.quantumCore },    // Dataflow Blue
      { dateBg: colors.neuralDrift, text: colors.quantumCore },    // Neural Drift
      { dateBg: colors.ionSpark, text: colors.quantumCore }         // Ion Spark
    ]
    
    const color = dateColors[(index - 1) % dateColors.length]
    return {
      container: '#FFFFFF',
      dateBg: color.dateBg,
      text: color.text,
      badge: colors.coreReactor,
      textColor: colors.quantumCore
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 opacity-50 mb-2" />
        <p className="text-sm">No upcoming events</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const { dayAbbr, dayNumber } = getDateInfo(event.date)
        const colors = getColorScheme(index, event.type)
        const isFirst = index === 0

        return (
          <div
            key={event.id}
            onClick={() => handleEventClick(event)}
            style={{ 
              backgroundColor: colors.container,
              boxShadow: isFirst ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
              cursor: 'pointer'
            }}
            className={`group flex items-center rounded-xl p-3 transition-all duration-200 ${
              isFirst 
                ? 'shadow-lg' 
                : 'border border-gray-200 dark:border-gray-700'
            } hover:opacity-90 active:scale-[0.98]`}
          >
            {/* Date Section */}
            <div 
              style={{ backgroundColor: colors.dateBg }}
              className={`rounded-lg p-3 min-w-[60px] flex flex-col items-center justify-center mr-3 ${
                isFirst ? '' : 'border border-gray-200 dark:border-gray-600'
              }`}
            >
              <span style={{ color: colors.text }} className="text-xs font-medium">{dayAbbr}</span>
              <span style={{ color: colors.text }} className="text-2xl font-bold">{dayNumber}</span>
            </div>

            {/* Event Details */}
            <div className="flex-1 flex items-center justify-between">
              <div className="flex-1">
                <h3 style={{ color: colors.textColor || colors.text }} className="font-bold text-base mb-0.5">
                  {event.title}
                </h3>
                <p style={{ color: isFirst ? 'rgba(255, 255, 255, 0.8)' : '#6B7280' }} className="text-sm">
                  {event.subtitle}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <span 
                  style={{ backgroundColor: colors.badge }}
                  className="text-white text-xs px-2 py-1 rounded-full font-medium"
                >
                  {event.time}
                </span>
                <ChevronRight 
                  size={20} 
                  style={{ color: colors.textColor || colors.text }}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
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
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
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

  const fetchUpcomingEvents = useCallback(async () => {
    if (!token) return

    try {
      setLoadingEvents(true)
      const leaves = await apiService.getUpcomingLeaves(token)
      
      // Generate upcoming events from leaves and add reminders
      const events: UpcomingEvent[] = []
      
      // Add leaves as events
      if (leaves && leaves.length > 0) {
        leaves.slice(0, 3).forEach((leave) => {
          events.push({
            id: leave.id,
            title: `${leave.first_name} ${leave.last_name}`,
            subtitle: 'Leave Request',
            date: leave.start_date,
            time: '09:00',
            type: 'leave'
          })
        })
      }
      
      // Add salary payment reminder (first of next month)
      const today = new Date()
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      events.push({
        id: 1000,
        title: 'Salary Payment',
        subtitle: 'Payment Reminder',
        date: nextMonth.toISOString().split('T')[0],
        time: '10:00',
        type: 'salary'
      })
      
      // Add bill payment reminder (15th of current/next month)
      const billDate = new Date(today)
      if (today.getDate() < 15) {
        billDate.setDate(15)
      } else {
        billDate.setMonth(today.getMonth() + 1)
        billDate.setDate(15)
      }
      events.push({
        id: 1001,
        title: 'Bill Payment',
        subtitle: 'Payment Reminder',
        date: billDate.toISOString().split('T')[0],
        time: '11:30',
        type: 'bill'
      })
      
      // Sort by date
      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      setUpcomingEvents(events.slice(0, 4))
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
    } finally {
      setLoadingEvents(false)
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
          fetchUpcomingEvents(),
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
        fetchUpcomingLeaves(),
        fetchUpcomingEvents()
      ])
    }
  }, [token, fetchUpcomingLeaves, fetchUpcomingEvents, refreshDashboardData, fetchMonthlyAttendanceTrend])

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
                  ? 'cursor-pointer hover:shadow-lg hover:scale-105' 
                  : ''
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

      {/* Charts Grid - Doughnut Chart and 6-Month Timeline */}
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

        {/* Monthly Attendance Trend Timeline */}
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
            <CardContent className="flex-1 pb-0 overflow-hidden">
              <SixMonthAttendanceTimeline monthlyData={monthlyAttendanceTrend} loading={loadingTrend} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Events Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Calendar size={20} />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingEvents events={upcomingEvents} loading={loadingEvents} />
          </CardContent>
        </Card>
      </motion.div>

     
    </div>
  )
}


