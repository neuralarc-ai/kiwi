import { motion } from 'framer-motion'
import { Users, Briefcase, CalendarCheck, Calendar, BarChart3, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [loadingChart, setLoadingChart] = useState(true)
  const [chartRefreshKey, setChartRefreshKey] = useState(0)
  const [forceUpdate, setForceUpdate] = useState(0) // Force component re-render

  const fetchAttendanceStats = useCallback(async () => {
    if (!token) return

    try {
      setLoadingChart(true)
      console.log('📊 Fetching attendance stats...')
      // Add cache-busting timestamp to ensure fresh data
      const data = await apiService.getDailyAttendanceStats(token, 7)
      console.log('📊 Attendance stats received:', data)
      
      // Normalize date format and keep original for calculations, add formatted date for display
      const formatted = data.map((item: any) => {
        // Normalize date to YYYY-MM-DD format - handle various date formats
        let dateStr = item.date
        if (item.date) {
          try {
            // If it's already a string in YYYY-MM-DD format, use it directly
            if (typeof item.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
              dateStr = item.date
            } else {
              // Otherwise, parse it
              const dateObj = new Date(item.date)
              dateStr = dateObj.toISOString().split('T')[0]
            }
          } catch (e) {
            console.error('Error parsing date:', item.date, e)
            dateStr = item.date
          }
        }
        return {
          ...item,
          date: dateStr,
          dateDisplay: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          dateOriginal: dateStr
        }
      })
      console.log('📊 Formatted attendance data:', formatted)
      console.log('📊 Setting attendanceData state...')
      // Force state update by creating completely new array with new object references
      const newData = formatted.map(item => ({ ...item, _timestamp: Date.now() }))
      
      // Use functional update to ensure React sees the change
      setAttendanceData(() => {
        console.log('🔄 Setting new attendanceData, length:', newData.length)
        return newData
      })
      
      // Force chart and component refresh - use setTimeout to ensure state is set first
      setTimeout(() => {
        setChartRefreshKey(prev => {
          const newKey = prev + 1
          console.log('🔄 Chart refresh key updated to:', newKey)
          return newKey
        })
        
        // Force component re-render
        setForceUpdate(prev => {
          const newUpdate = prev + 1
          console.log('🔄 Force update triggered:', newUpdate)
          return newUpdate
        })
        console.log('🔄 State updated, triggering re-render...')
      }, 100)
      
      // Force a small delay then check if today's data is in the results
      setTimeout(() => {
        const today = new Date().toISOString().split('T')[0]
        const todayInData = formatted.find((item: any) => {
          const itemDate = item.dateOriginal || item.date
          return itemDate === today
        })
        if (todayInData) {
          console.log('✅ Today\'s data found in fetched data:', todayInData)
        } else {
          console.warn('⚠️ Today\'s data NOT found in fetched data. Today is:', today)
          console.log('📊 Available dates:', formatted.map((item: any) => item.dateOriginal || item.date))
        }
      }, 100)
    } catch (error) {
      console.error('❌ Error fetching attendance stats:', error)
    } finally {
      setLoadingChart(false)
    }
  }, [token])

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
    refreshDashboardData()
    fetchUpcomingLeaves()
    fetchAttendanceStats()
    
    // Expose refresh function globally for testing
    ;(window as any).refreshDashboard = async () => {
      console.log('🔄 Global refresh function called')
      await Promise.all([
        fetchAttendanceStats(),
        refreshDashboardData(),
        fetchUpcomingLeaves()
      ])
    }
    
    // Set up frequent polling (refresh every 3 seconds when page is visible)
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !loadingChart) {
        console.log('🔄 Polling: Refreshing attendance stats...')
        fetchAttendanceStats()
      }
    }, 3000) // Poll every 3 seconds for faster updates

    // Listen for attendance updates from other pages
    const handleAttendanceUpdate = async (event: any) => {
      const detail = event?.detail || {}
      console.log('🔄 Attendance updated event received:', detail)
      console.log('🔄 Refreshing dashboard...')
      try {
        // Wait for database commit
        await new Promise(resolve => setTimeout(resolve, 600))
        
        // Refresh attendance stats (most critical)
        console.log('📊 Fetching fresh attendance stats...')
        await fetchAttendanceStats()
        
        // Wait a bit then refresh again to ensure we get the latest data
        await new Promise(resolve => setTimeout(resolve, 400))
        await fetchAttendanceStats()
        
        // Refresh other data
        console.log('📊 Refreshing other dashboard data...')
        await Promise.all([
          refreshDashboardData(),
          fetchUpcomingLeaves()
        ])
        
        console.log('✅ Dashboard fully refreshed after attendance update')
      } catch (error) {
        console.error('❌ Error refreshing dashboard:', error)
      }
    }

    // Add event listener on window
    window.addEventListener('attendanceUpdated', handleAttendanceUpdate)
    // Also add on document as backup
    document.addEventListener('attendanceUpdated', handleAttendanceUpdate)
    
    // Also listen for localStorage events (works across tabs)
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'attendanceUpdated' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue)
          console.log('🔄 LocalStorage attendance update received:', data)
          await handleAttendanceUpdate({ detail: data } as any)
        } catch (error) {
          console.error('Error parsing storage event:', error)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Also check localStorage on mount/visibility (for same-tab updates)
    const checkLocalStorage = async () => {
      const stored = localStorage.getItem('attendanceUpdated')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          // Only refresh if data is recent (within last 5 seconds)
          if (data.timestamp && Date.now() - data.timestamp < 5000) {
            console.log('🔄 Found recent attendance update in localStorage, refreshing...')
            await handleAttendanceUpdate({ detail: data } as any)
          }
        } catch (error) {
          console.error('Error parsing localStorage:', error)
        }
      }
    }
    
    // Check immediately and on visibility change
    checkLocalStorage()
    
    // Also refresh when page becomes visible (user navigates back to dashboard)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page visible, refreshing all data...')
        // Immediately refresh all data when page becomes visible
        await Promise.all([
          refreshDashboardData(),
          fetchUpcomingLeaves(),
          fetchAttendanceStats()
        ])
        // Check localStorage for recent updates
        await checkLocalStorage()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Also listen for focus events (when user switches back to this tab)
    const handleFocus = async () => {
      console.log('👁️ Window focused, refreshing dashboard...')
      // Refresh immediately when window gets focus
      await Promise.all([
        refreshDashboardData(),
        fetchUpcomingLeaves(),
        fetchAttendanceStats()
      ])
    }
    
    window.addEventListener('focus', handleFocus)
    
    // Also refresh when component becomes visible (React Router navigation)
    const handlePageShow = async () => {
      console.log('👁️ Page shown, refreshing dashboard...')
      await Promise.all([
        refreshDashboardData(),
        fetchUpcomingLeaves(),
        fetchAttendanceStats()
      ])
    }
    
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate)
      document.removeEventListener('attendanceUpdated', handleAttendanceUpdate)
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('pageshow', handlePageShow)
    }
  }, [token, fetchAttendanceStats, fetchUpcomingLeaves, refreshDashboardData])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate today's attendance stats from chart data - recalculate when attendanceData changes
  const todayStats = useMemo(() => {
    if (!attendanceData || attendanceData.length === 0) {
      console.log('⚠️ No attendance data available for todayStats')
      return { present: 0, absent: 0, late: 0, on_leave: 0 }
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    console.log('📅 Looking for today\'s data:', todayStr, 'in', attendanceData.length, 'items')
    
    // Try to find today's data - check all possible date fields
    let todayData = null
    for (const item of attendanceData) {
      const itemDate = item.dateOriginal || item.date
      if (!itemDate) continue
      
      // Normalize the date - handle both string and Date objects
      let normalizedItemDate: string | null = null
      try {
        if (typeof itemDate === 'string') {
          normalizedItemDate = new Date(itemDate).toISOString().split('T')[0]
        } else if (itemDate instanceof Date) {
          normalizedItemDate = itemDate.toISOString().split('T')[0]
        } else {
          normalizedItemDate = new Date(String(itemDate)).toISOString().split('T')[0]
        }
      } catch (e) {
        console.error('Error normalizing date:', itemDate, e)
        continue
      }
      
      if (normalizedItemDate === todayStr) {
        todayData = item
        console.log('✅ Found today\'s data:', item)
        break
      }
    }
    
    // If not found, use the most recent data (last item in array, which should be today or closest)
    if (!todayData) {
      todayData = attendanceData[attendanceData.length - 1] || {}
      console.log('⚠️ Today\'s data not found, using most recent:', todayData)
    }
    
    const stats = {
      present: parseInt(todayData.present) || 0,
      absent: parseInt(todayData.absent) || 0,
      late: parseInt(todayData.late) || 0,
      on_leave: parseInt(todayData.on_leave) || 0
    }
    
    console.log('📊 Today\'s stats calculated:', stats, 'from data:', todayData)
    return stats
  }, [attendanceData])
  
  // Memoize stat cards to ensure they update when stats change
  // Use stats from API directly for attendance counts (more reliable than calculating from attendanceData)
  const statCards = useMemo(() => {
    const presentValue = stats.todayPresent ?? todayStats.present ?? 0
    const absentValue = stats.todayAbsent ?? todayStats.absent ?? 0
    const lateValue = stats.todayLate ?? todayStats.late ?? 0
    const onLeaveValue = stats.todayOnLeave ?? todayStats.on_leave ?? 0
    
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
    todayStats.present, 
    todayStats.absent, 
    todayStats.late, 
    todayStats.on_leave,
    forceUpdate
  ])

  const handleStatClick = (status: string | undefined) => {
    // Refresh data when clicking on stat cards to ensure latest data
    if (status) {
      console.log(`🔄 Stat card clicked: ${status}, refreshing data...`)
      // Refresh both dashboard stats (which includes today's counts) and attendance chart data
      Promise.all([
        refreshDashboardData(),
        fetchAttendanceStats()
      ]).then(() => {
        console.log('✅ Data refreshed after stat card click')
        // Force UI update after data is refreshed
        setTimeout(() => {
          setForceUpdate(prev => prev + 1)
          setChartRefreshKey(prev => prev + 1)
        }, 200)
      })
    }
  }



  // Force chart refresh when stats change (for pie chart and stat cards updates)
  useEffect(() => {
    console.log('🔄 Stats changed, checking if refresh needed...', {
      todayPresent: stats.todayPresent,
      todayAbsent: stats.todayAbsent,
      todayLate: stats.todayLate,
      todayOnLeave: stats.todayOnLeave,
      attendanceDataLength: attendanceData.length,
      loadingChart
    })
    
    if ((stats.todayPresent !== undefined || stats.todayAbsent !== undefined || stats.todayLate !== undefined || stats.todayOnLeave !== undefined) && !loadingChart) {
      console.log('🔄 Stats have today values, forcing UI refresh...')
      
      // Force updates immediately
      setChartRefreshKey(prev => {
        const newKey = prev + 1
        console.log('🔄 Chart key updated to:', newKey)
        return newKey
      })
      setForceUpdate(prev => {
        const newUpdate = prev + 1
        console.log('🔄 Force update to:', newUpdate)
        return newUpdate
      })
      console.log('🔄 Force update triggered for UI refresh')
    }
  }, [stats.todayPresent, stats.todayAbsent, stats.todayLate, stats.todayOnLeave, attendanceData.length, loadingChart])

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
        transition={{ delay: 0.3 }}
      >
        <Card variant="glass">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <BarChart3 size={18} className="md:w-5 md:h-5 flex-shrink-0" />
                <span className="truncate">
                  Today's Attendance Overview
                </span>
              </CardTitle>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    console.log('🔄 Manual refresh triggered')
                    setLoadingChart(true)
                    try {
                      await Promise.all([
                        fetchAttendanceStats(),
                        refreshDashboardData(),
                        fetchUpcomingLeaves()
                      ])
                      console.log('✅ Manual refresh completed')
                    } catch (error) {
                      console.error('❌ Error in manual refresh:', error)
                    } finally {
                      setLoadingChart(false)
                    }
                  }}
                  className="text-xs flex items-center gap-1"
                  title="Refresh attendance data"
                  disabled={loadingChart}
                >
                  <RefreshCw size={14} className={loadingChart ? 'animate-spin' : ''} />
                  {loadingChart ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <div className="h-[350px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : !attendanceData || attendanceData.length === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">No attendance data available</p>
                  <p className="text-xs mt-2">Mark attendance to see the graph</p>
                </div>
              </div>
            ) : (
              <div className="w-full" style={{ minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height={350} key={`attendance-chart-${chartRefreshKey}-${forceUpdate}`}>
                  <LineChart 
                    data={attendanceData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="dateDisplay" 
                      stroke="#888"
                      style={{ fontSize: '12px' }}
                      tick={{ fill: '#888' }}
                    />
                    <YAxis 
                      stroke="#888"
                      style={{ fontSize: '12px' }}
                      tick={{ fill: '#888' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: any, name: string) => [`${value} employees`, name]}
                    />
                    <Legend 
                      formatter={(value: string) => <span style={{ color: '#fff' }}>{value}</span>}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="present" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name="Present"
                      dot={{ fill: '#22c55e', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="absent" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Absent"
                      dot={{ fill: '#ef4444', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="late" 
                      stroke="#eab308" 
                      strokeWidth={2}
                      name="Late"
                      dot={{ fill: '#eab308', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="on_leave" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="On Leave"
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
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

