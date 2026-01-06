import { motion } from 'framer-motion'
import { Users, Briefcase, CalendarCheck, Calendar, BarChart3, DollarSign, TrendingUp, TrendingDown, Bell, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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

// Color palette matching attendance tracking page CSS variables
// These match the exact colors used in AttendanceTracking.tsx
const paletteColors = {
  present: '#27584F',      // Dark Green (matches hsl(var(--palette-dark-green)))
  absent: '#E0693D',       // Red/Orange (matches hsl(var(--palette-red-orange)))
  late: '#E7B31B',         // Yellow (matches hsl(var(--palette-yellow)))
  onLeave: '#A6C8D5',      // Light Blue (matches hsl(var(--palette-light-blue)))
  lavender: '#A69CBE',     // Light purple/lavender
  pink: '#EFB3AF',         // Light pink
  darkGray: '#262626'      // Dark grey/black
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
    { label: 'Present', key: 'present', color: paletteColors.present },
    { label: 'Absent', key: 'absent', color: paletteColors.absent },
    { label: 'Late', key: 'late', color: paletteColors.late },
    { label: 'On Leave', key: 'onLeave', color: paletteColors.onLeave }
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
    
    if (present > 0) return paletteColors.present
    if (absent > 0) return paletteColors.absent
    if (late > 0) return paletteColors.late
    if (onLeave > 0) return paletteColors.onLeave
    return '#9CA3AF'
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
                  className={`p-1 text-center border-l border-gray-200 dark:border-gray-700 flex items-center justify-center`}
                  style={isCurrentMonth ? { backgroundColor: `${paletteColors.absent}20` } : {}}
                >
                  {isCurrentMonth ? (
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white font-semibold text-[9px]"
                      style={{ backgroundColor: paletteColors.absent }}
                    >
                      {month.substring(0, 2)}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="text-[10px] font-medium">{month.substring(0, 3)}</span>
                      {dotColor && (
                        <span 
                          className="w-1 h-1 rounded-full" 
                          style={{ backgroundColor: dotColor }}
                        />
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
                {monthlyData.months.map((_month, monthIndex) => {
                  const count = monthlyData[status.key as keyof typeof monthlyData][monthIndex] as number || 0
                  const hasData = count > 0
                  const heightPercentage = maxValue > 0 ? (count / maxValue) * 100 : 0
                  const isCurrentMonth = monthIndex === monthlyData.months.length - 1

                  return (
                    <div
                      key={monthIndex}
                      className="border-r border-gray-200 dark:border-gray-700 p-0.5 flex items-end"
                      style={isCurrentMonth ? { backgroundColor: `${paletteColors.absent}15` } : {}}
                    >
                      {hasData && (
                        <div
                          className="text-white text-[9px] px-0.5 py-0.5 rounded w-full flex items-center justify-center font-medium shadow-sm"
                          style={{ 
                            backgroundColor: status.color,
                            height: `${Math.max(heightPercentage, 12)}%`, 
                            minHeight: '18px' 
                          }}
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
      <div className="flex flex-wrap gap-2 pt-2">
        {statusTypes.map((status) => (
          <div key={status.key} className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: status.color }}
            ></div>
            <span className="text-[10px] text-muted-foreground font-medium">{status.label}</span>
          </div>
        ))}
      </div>
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
  const [_upcomingLeaves, _setUpcomingLeaves] = useState<UpcomingLeave[]>([])
  const [_loadingLeaves, _setLoadingLeaves] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [forceUpdate, setForceUpdate] = useState(0) // Force component re-render
  const [showReminderModal, setShowReminderModal] = useState(false)
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
  const [accountingData, setAccountingData] = useState<any[]>([])
  const [previousMonthAccountingData, setPreviousMonthAccountingData] = useState<any[]>([])
  const [loadingAccounting, setLoadingAccounting] = useState(false)
  const [payrollData, setPayrollData] = useState<any[]>([])
  const [loadingPayroll, setLoadingPayroll] = useState(false)

  const fetchUpcomingLeaves = useCallback(async () => {
    if (!token) return

    try {
      _setLoadingLeaves(true)
      const leaves = await apiService.getUpcomingLeaves(token)
      _setUpcomingLeaves(leaves || [])
    } catch (error) {
      console.error('Error fetching upcoming leaves:', error)
    } finally {
      _setLoadingLeaves(false)
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

  const fetchAccountingData = useCallback(async () => {
    if (!token) return

    try {
      setLoadingAccounting(true)
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()
      
      // Calculate previous month
      const prevDate = new Date(currentYear, currentMonth - 2, 1)
      const prevMonth = prevDate.getMonth() + 1
      const prevYear = prevDate.getFullYear()

      // Sync salary first for current month
      try {
        await apiService.syncSalaryFromPayroll(token, currentMonth, currentYear)
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (syncError) {
        console.warn('Could not sync salary:', syncError)
      }

      // Fetch current and previous month data
      const [currentData, previousData] = await Promise.all([
        apiService.getAccountingData(token, currentMonth, currentYear),
        apiService.getAccountingData(token, prevMonth, prevYear)
      ])

      setAccountingData(Array.isArray(currentData) ? currentData : [])
      setPreviousMonthAccountingData(Array.isArray(previousData) ? previousData : [])
    } catch (error) {
      console.error('Error fetching accounting data:', error)
      setAccountingData([])
      setPreviousMonthAccountingData([])
    } finally {
      setLoadingAccounting(false)
    }
  }, [token])

  const fetchPayrollData = useCallback(async () => {
    if (!token) return

    try {
      setLoadingPayroll(true)
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentYear = currentDate.getFullYear()
      
      const data = await apiService.getPayrolls(token, currentMonth, currentYear, undefined, true)
      setPayrollData(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching payroll data:', error)
      setPayrollData([])
    } finally {
      setLoadingPayroll(false)
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
          fetchMonthlyAttendanceTrend(),
          fetchAccountingData(),
          fetchPayrollData()
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
  }, [token, fetchUpcomingLeaves, fetchUpcomingEvents, refreshDashboardData, fetchMonthlyAttendanceTrend, fetchAccountingData, fetchPayrollData])


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
        iconColor: paletteColors.darkGray, // Dark gray for neutral
        gradient: 'from-gray-500 to-gray-600',
        clickable: false
      },
      {
        label: 'Present',
        value: presentValue,
        icon: Users,
        iconColor: paletteColors.present, // #27584F - Dark Green
        gradient: 'from-green-500 to-emerald-500',
        clickable: false,
        status: 'present'
      },
      {
        label: 'Absent',
        value: absentValue,
        icon: Users,
        iconColor: paletteColors.absent, // #E0693D - Red/Orange
        gradient: 'from-red-500 to-rose-500',
        clickable: false,
        status: 'absent'
      },
      {
        label: 'Late',
        value: lateValue,
        icon: CalendarCheck,
        iconColor: paletteColors.late, // #E7B31B - Yellow
        gradient: 'from-yellow-500 to-amber-500',
        clickable: false,
        status: 'late'
      },
      {
        label: 'Active Jobs',
        value: stats.activeJobPostings,
        icon: Briefcase,
        iconColor: paletteColors.lavender, // #A69CBE - Light Purple
        gradient: 'from-gray-300 to-gray-400',
        clickable: false
      },
      {
        label: 'Upcoming Events',
        value: upcomingEvents.length,
        icon: Calendar,
        iconColor: paletteColors.onLeave, // #A6C8D5 - Light Blue
        gradient: 'from-blue-500 to-cyan-500',
        clickable: false,
        isUpcomingEvents: true
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
    upcomingEvents.length,
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


  // Calculate expense breakdown by category
  const expenseBreakdownData = useMemo(() => {
    const categories = {
      'Salary & Wages': { amount: 0, color: paletteColors.present }, // #27584F - Dark Green
      'Vendors': { amount: 0, color: paletteColors.absent }, // #E0693D - Red/Orange
      'Operations': { amount: 0, color: paletteColors.late }, // #E7B31B - Yellow
      'Travel': { amount: 0, color: paletteColors.onLeave }, // #A6C8D5 - Light Blue
      'Marketing': { amount: 0, color: paletteColors.lavender }, // #A69CBE - Lavender
      'Tax & Compliance': { amount: 0, color: paletteColors.pink }, // #EFB3AF - Light Pink
      'TDS': { amount: 0, color: paletteColors.pink }, // #EFB3AF - Light Pink
      'GST/Tax': { amount: 0, color: paletteColors.lavender }, // #A69CBE - Lavender
    }

    // Calculate totals by category
    accountingData.forEach((entry: any) => {
      const head = entry.head || ''
      const amount = parseFloat(entry.amount) || 0
      const tdsPercentage = parseFloat(entry.tdsPercentage) || 0
      const gstPercentage = parseFloat(entry.gstPercentage) || 0

      // Calculate TDS
      if (tdsPercentage > 0) {
        categories['TDS'].amount += (amount * tdsPercentage) / 100
      }

      // Calculate GST
      if (gstPercentage > 0) {
        categories['GST/Tax'].amount += (amount * gstPercentage) / 100
      }

      if (head === 'Salary & Wages') {
        categories['Salary & Wages'].amount += amount
      } else if (head === 'Tax & Compliance') {
        categories['Tax & Compliance'].amount += amount
      } else if (head === 'Operations') {
        categories['Operations'].amount += amount
      } else if (head === 'Travel') {
        categories['Travel'].amount += amount
      } else if (head === 'Marketing') {
        categories['Marketing'].amount += amount
      } else {
        // All other entries go to Vendors
        categories['Vendors'].amount += amount
      }
    })

    // Filter out categories with zero amounts
    const labels: string[] = []
    const data: number[] = []
    const backgroundColor: string[] = []

    Object.entries(categories).forEach(([category, info]) => {
      if (info.amount > 0) {
        labels.push(category)
        data.push(info.amount)
        backgroundColor.push(info.color)
      }
    })

    return {
      labels,
      datasets: [{
        label: 'Expense Breakdown',
          data,
          backgroundColor,
        hoverOffset: 4
      }]
    }
  }, [accountingData])

  // Calculate monthly totals and comparison
  const monthlyComparison = useMemo(() => {
    let currentTotal = 0
    let currentTDS = 0
    let currentGST = 0

    accountingData.forEach((entry: any) => {
      const amount = parseFloat(entry.amount) || 0
      const tdsPercentage = parseFloat(entry.tdsPercentage) || 0
      const gstPercentage = parseFloat(entry.gstPercentage) || 0

      currentTotal += amount
      
      if (tdsPercentage > 0) {
        currentTDS += (amount * tdsPercentage) / 100
      }
      
      if (gstPercentage > 0) {
        currentGST += (amount * gstPercentage) / 100
      }
    })

    let previousTotal = 0
    let previousTDS = 0
    let previousGST = 0

    previousMonthAccountingData.forEach((entry: any) => {
      const amount = parseFloat(entry.amount) || 0
      const tdsPercentage = parseFloat(entry.tdsPercentage) || 0
      const gstPercentage = parseFloat(entry.gstPercentage) || 0

      previousTotal += amount
      
      if (tdsPercentage > 0) {
        previousTDS += (amount * tdsPercentage) / 100
      }
      
      if (gstPercentage > 0) {
        previousGST += (amount * gstPercentage) / 100
      }
    })

    const difference = currentTotal - previousTotal
    const tdsDifference = currentTDS - previousTDS
    const gstDifference = currentGST - previousGST
    const percentageChange = previousTotal > 0 
      ? ((difference / previousTotal) * 100).toFixed(1)
      : currentTotal > 0 ? '100.0' : '0.0'

    return {
      currentTotal,
      previousTotal,
      difference,
      percentageChange: parseFloat(percentageChange),
      currentTDS,
      previousTDS,
      tdsDifference,
      currentGST,
      previousGST,
      gstDifference
    }
  }, [accountingData, previousMonthAccountingData])


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
                <div 
                  className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${stat.isUpcomingEvents ? 'cursor-pointer' : ''}`}
                  style={{ 
                    backgroundColor: `${stat.iconColor}20`,
                    border: `1px solid ${stat.iconColor}40`
                  }}
                  onClick={(e) => {
                    if (stat.isUpcomingEvents) {
                      e.stopPropagation()
                      setShowReminderModal(true)
                    }
                  }}
                >
                  <stat.icon 
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    style={{ color: stat.iconColor }}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center pt-0">
                {stat.isUpcomingEvents ? (
                  <div className="flex flex-col gap-1">
                    {loadingEvents ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (() => {
                      // Filter to show only bill and salary events in the card
                      const paymentEvents = upcomingEvents.filter(e => e.type === 'bill' || e.type === 'salary')
                      
                      return paymentEvents.length > 0 || upcomingEvents.length > 0 ? (
                        <>
                          <div className="flex items-baseline">
                            <span key={`value-${stat.value}-${forceUpdate}`} className="text-xl sm:text-2xl font-bold">
                              {stat.value}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {paymentEvents.length > 0 ? 'Payment Reminders' : 'Upcoming Events'}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">No events</span>
                      )
                    })()}
                  </div>
                ) : (
                <div className="flex items-baseline">
                  {loading ? (
                    <Skeleton className="h-10 w-20" />
                  ) : (
                      <span key={`value-${stat.value}-${forceUpdate}`} className="text-xl sm:text-2xl font-bold">
                      {stat.value}
                    </span>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Expense Breakdown Chart and Monthly Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Expense Breakdown Pie Chart */}
 <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
      >
        <Card variant="glass" className="flex flex-col">
          <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <DollarSign size={20} />
                Expense Breakdown (Current Month)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
              {loadingAccounting ? (
                <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
              ) : expenseBreakdownData.labels.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
                  <DollarSign className="w-12 h-12 opacity-50" />
                  <p className="text-base font-medium">No expense data for this month</p>
                  <p className="text-sm">Add accounting entries to see the breakdown</p>
              </div>
            ) : (
                <div className="h-[300px] w-full">
                  <Pie 
                    data={expenseBreakdownData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1000
                      },
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                          labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                              size: 12,
                            },
                          },
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context: any) {
                              const label = context.label || ''
                              const value = context.parsed || 0
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
                              return `${label}: ₹${value.toLocaleString('en-IN')} (${percentage}%)`
                            },
                          },
                        },
                      },
                    }}
                  />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

        {/* Monthly Comparison Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card variant="glass" className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp size={20} />
                Monthly Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              {loadingAccounting ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-md" />
                </div>
              ) : (
                <div className="flex flex-col h-[300px]">
                  {/* Upper Section - Data Rows */}
                  <div className="flex-1 flex flex-col divide-y divide-gray-200 dark:divide-gray-700 overflow-y-auto">
                    {/* Current Month Total */}
                    <div className="flex items-center justify-between py-2.5 px-3 flex-shrink-0">
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Current Month Total</span>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        ₹{monthlyComparison.currentTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Previous Month Total */}
                    <div className="flex items-center justify-between py-2.5 px-3 flex-shrink-0">
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">Previous Month Total</span>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        ₹{monthlyComparison.previousTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* TDS Current */}
                    <div className="flex items-center justify-between py-2.5 px-3 flex-shrink-0">
                      <span className="font-medium text-sm" style={{ color: paletteColors.pink }}>
                        TDS (Current)
                      </span>
                      <span className="font-semibold text-sm" style={{ color: paletteColors.pink }}>
                        ₹{monthlyComparison.currentTDS.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* TDS Previous */}
                    <div className="flex items-center justify-between py-2.5 px-3 flex-shrink-0">
                      <span className="font-medium text-sm" style={{ color: paletteColors.pink }}>
                        TDS (Previous)
                      </span>
                      <span className="font-semibold text-sm" style={{ color: paletteColors.pink }}>
                        ₹{monthlyComparison.previousTDS.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* GST/Tax Current */}
                    <div className="flex items-center justify-between py-2.5 px-3 flex-shrink-0">
                      <span className="font-medium text-sm" style={{ color: paletteColors.lavender }}>
                        GST/Tax (Current)
                      </span>
                      <span className="font-semibold text-sm" style={{ color: paletteColors.lavender }}>
                        ₹{monthlyComparison.currentGST.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* GST/Tax Previous */}
                    <div className="flex items-center justify-between py-2.5 px-3 flex-shrink-0">
                      <span className="font-medium text-sm" style={{ color: paletteColors.lavender }}>
                        GST/Tax (Previous)
                      </span>
                      <span className="font-semibold text-sm" style={{ color: paletteColors.lavender }}>
                        ₹{monthlyComparison.previousGST.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Lower Section - Total Change */}
                  <div 
                    className="p-2.5 rounded-lg mt-2 flex-shrink-0"
                    style={{ 
                      backgroundColor: paletteColors.present,
                      color: 'white'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {monthlyComparison.difference >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        <span className="text-xs font-medium">Total Change</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold">
                          ₹{Math.abs(monthlyComparison.difference).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] font-medium opacity-90">
                          {monthlyComparison.difference >= 0 ? '+' : ''}{monthlyComparison.percentageChange}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Grid - Monthly Attendance Chart and Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Monthly Attendance Trend Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card variant="glass" className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Bell size={20} />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              {loadingEvents || loadingAccounting || loadingPayroll ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-md" />
                </div>
              ) : (() => {
                const notifications: Array<{
                  id: number
                  type: 'payment' | 'vendor' | 'salary' | 'bill' | 'leave' | 'other'
                  title: string
                  message: string
                  date: string
                  priority: 'high' | 'medium' | 'low'
                }> = []

                // Add payment reminders from upcoming events
                const paymentEvents = upcomingEvents.filter(e => e.type === 'bill' || e.type === 'salary')
                paymentEvents.forEach((event) => {
                  const eventDate = new Date(event.date)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  eventDate.setHours(0, 0, 0, 0)
                  const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  
                  if (daysUntil >= 0 && daysUntil <= 7) {
                    notifications.push({
                      id: event.id,
                      type: event.type === 'bill' ? 'bill' : 'salary',
                      title: event.type === 'bill' ? 'Bill Payment Due' : 'Salary Payment Due',
                      message: `${event.title} - ${daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`}`,
                      date: event.date,
                      priority: daysUntil <= 2 ? 'high' : daysUntil <= 5 ? 'medium' : 'low'
                    })
                  }
                })

                // Add unpaid salary notifications
                if (payrollData && payrollData.length > 0) {
                  const unpaidSalaries = payrollData.filter((payroll: any) => {
                    const status = (payroll.payment_status || payroll.status || '').toLowerCase()
                    return status !== 'paid'
                  })
                  
                  if (unpaidSalaries.length > 0) {
                    const totalUnpaidAmount = unpaidSalaries.reduce((sum: number, payroll: any) => 
                      sum + (parseFloat(payroll.net_salary || payroll.basic_salary || 0) || 0), 0
                    )
                    
                    if (totalUnpaidAmount > 0) {
                      notifications.push({
                        id: 3000,
                        type: 'salary',
                        title: 'Unpaid Salaries',
                        message: `${unpaidSalaries.length} employee${unpaidSalaries.length > 1 ? 's' : ''} with unpaid salaries (₹${totalUnpaidAmount.toLocaleString('en-IN')})`,
                        date: new Date().toISOString().split('T')[0],
                        priority: 'high'
                      })
                    }
                  }
                }

                // Add leave request notifications
                if (_upcomingLeaves && _upcomingLeaves.length > 0) {
                  const upcomingLeaves = _upcomingLeaves.filter((leave) => {
                    const leaveDate = new Date(leave.start_date)
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    leaveDate.setHours(0, 0, 0, 0)
                    const daysUntil = Math.ceil((leaveDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    return daysUntil >= 0 && daysUntil <= 7
                  })
                  
                  if (upcomingLeaves.length > 0) {
                    upcomingLeaves.forEach((leave) => {
                      const leaveDate = new Date(leave.start_date)
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      leaveDate.setHours(0, 0, 0, 0)
                      const daysUntil = Math.ceil((leaveDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      
                      notifications.push({
                        id: 4000 + leave.id,
                        type: 'leave',
                        title: 'Leave Request',
                        message: `${leave.first_name} ${leave.last_name} - ${leave.leave_type} leave ${daysUntil === 0 ? 'starts today' : daysUntil === 1 ? 'starts tomorrow' : `starts in ${daysUntil} days`}`,
                        date: leave.start_date,
                        priority: daysUntil <= 2 ? 'high' : 'medium'
                      })
                    })
                  }
                }

                // Add vendor payment notifications (if there are unpaid vendor entries)
                if (accountingData && accountingData.length > 0) {
                  const vendorEntries = accountingData.filter((entry: any) => 
                    entry.head !== 'Salary & Wages' && 
                    entry.head !== 'GST Payable' &&
                    parseFloat(entry.amount) > 0
                  )
                  
                  if (vendorEntries.length > 0) {
                    const totalVendorAmount = vendorEntries.reduce((sum: number, entry: any) => 
                      sum + (parseFloat(entry.amount) || 0), 0
                    )
                    
                    if (totalVendorAmount > 0) {
                      notifications.push({
                        id: 2000,
                        type: 'vendor',
                        title: 'Vendor Payments',
                        message: `${vendorEntries.length} vendor payment${vendorEntries.length > 1 ? 's' : ''} pending (₹${totalVendorAmount.toLocaleString('en-IN')})`,
                        date: new Date().toISOString().split('T')[0],
                        priority: 'medium'
                      })
                    }
                  }
                }

                if (notifications.length === 0) {
                  return (
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground space-y-2">
                      <Bell className="w-12 h-12 opacity-50" />
                      <p className="text-base font-medium">No notifications</p>
                      <p className="text-sm">All caught up!</p>
                    </div>
                  )
                }

                // Sort by priority and date
                notifications.sort((a, b) => {
                  const priorityOrder = { high: 0, medium: 1, low: 2 }
                  if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                    return priorityOrder[a.priority] - priorityOrder[b.priority]
                  }
                  return new Date(a.date).getTime() - new Date(b.date).getTime()
                })

                const getNotificationColor = (type: string, priority: string) => {
                  if (priority === 'high') {
                    if (type === 'bill') return paletteColors.absent
                    if (type === 'salary') return paletteColors.present
                    if (type === 'leave') return paletteColors.late
                    return paletteColors.absent
                  }
                  if (type === 'vendor') return paletteColors.late
                  if (type === 'leave') return paletteColors.onLeave
                  if (type === 'salary') return paletteColors.present
                  return paletteColors.onLeave
                }

                const getNotificationIcon = (type: string) => {
                  switch (type) {
                    case 'salary':
                      return DollarSign
                    case 'bill':
                      return DollarSign
                    case 'vendor':
                      return Briefcase
                    case 'leave':
                      return CalendarCheck
                    default:
                      return AlertCircle
                  }
                }

                // Duplicate notifications for seamless loop
                const duplicatedNotifications = [...notifications, ...notifications]
                // Calculate animation duration based on number of notifications (4 seconds per notification)
                const animationDuration = notifications.length > 0 ? notifications.length * 4 : 16
                
                return (
                  <div className="h-[300px] overflow-hidden relative">
                    <style>{`
                      @keyframes scrollTicker {
                        0% {
                          transform: translateY(0);
                        }
                        100% {
                          transform: translateY(-50%);
                        }
                      }
                      .news-ticker {
                        animation: scrollTicker ${animationDuration}s linear infinite;
                      }
                      .news-ticker:hover {
                        animation-play-state: paused;
                      }
                    `}</style>
                    <div 
                      className="space-y-3 p-2 news-ticker"
                    >
                      {duplicatedNotifications.map((notification, index) => {
                        const Icon = getNotificationIcon(notification.type)
                        const color = getNotificationColor(notification.type, notification.priority)
                        
                        return (
                          <div
                            key={`${notification.id}-${index}`}
                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md"
                            style={{
                              backgroundColor: `${color}10`,
                              borderColor: `${color}30`
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="p-2 rounded-lg flex-shrink-0"
                                style={{
                                  backgroundColor: `${color}20`
                                }}
                              >
                                <Icon size={16} style={{ color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-sm">{notification.title}</h4>
                                  {notification.priority === 'high' && (
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                      style={{ backgroundColor: color }}
                                    >
                                      Urgent
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">{notification.message}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {new Date(notification.date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Reminder Modal for Bill and Salary Payments */}
      <Dialog open={showReminderModal} onOpenChange={setShowReminderModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: paletteColors.absent }} />
              Payment Reminders
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {loadingEvents ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (() => {
              const paymentEvents = upcomingEvents.filter(e => e.type === 'bill' || e.type === 'salary')
              
              if (paymentEvents.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 opacity-50 mb-2" />
                    <p className="text-sm">No payment reminders</p>
    </div>
  )
}

              const formatDate = (dateString: string) => {
                const date = new Date(dateString)
                return date.toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })
              }

              return (
                <div className="space-y-3">
                  {paymentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                      style={{
                        backgroundColor: event.type === 'bill' 
                          ? `${paletteColors.absent}10` 
                          : `${paletteColors.present}10`
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="px-2 py-1 rounded text-xs font-medium text-white"
                              style={{
                                backgroundColor: event.type === 'bill' 
                                  ? paletteColors.absent 
                                  : paletteColors.present
                              }}
                            >
                              {event.type === 'bill' ? 'Bill Payment' : 'Salary Payment'}
                            </div>
                          </div>
                          <h3 className="font-semibold text-base mb-1">{event.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{event.subtitle}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{formatDate(event.date)}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{event.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}


