import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Clock, Users, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { apiService, Employee } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface EmployeeAttendance {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  email: string
  department: string
  position: string
  hire_date?: string
  attendance_status: string | null
  check_in_time: string | null
  check_out_time: string | null
}

export default function AttendanceTracking() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [employees, setEmployees] = useState<EmployeeAttendance[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [updating, setUpdating] = useState<number | null>(null)
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveFormData, setLeaveFormData] = useState({
    employee_id: '',
    leave_type: 'sick',
    start_date: '',
    end_date: '',
    reason: ''
  })
  const [submittingLeave, setSubmittingLeave] = useState(false)
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthlyAttendance, setMonthlyAttendance] = useState<any[]>([])
  const [loadingMonthly, setLoadingMonthly] = useState(false)
  const [upcomingLeaves, setUpcomingLeaves] = useState<any[]>([])
  const [loadingUpcomingLeaves, setLoadingUpcomingLeaves] = useState(false)
  const [showUpcomingLeaves, setShowUpcomingLeaves] = useState(false)
  const isHR = user?.role === 'admin' || user?.role === 'hr_executive'

  useEffect(() => {
    if (viewMode === 'daily') {
      fetchEmployeesWithAttendance()
    } else {
      fetchMonthlyAttendance()
    }
    if (isHR) {
      fetchAllEmployees()
      fetchUpcomingLeaves()
    }
  }, [token, selectedDate, isHR, viewMode, selectedMonth, selectedYear])

  const fetchAllEmployees = async () => {
    if (!token) return
    try {
      const data = await apiService.getEmployees(token)
      setAllEmployees(data)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const fetchEmployeesWithAttendance = async () => {
    if (!token) return

    try {
      setLoading(true)
      const data = await apiService.getEmployeesWithAttendance(token, selectedDate)
      setEmployees(data)
    } catch (error) {
      console.error('Error fetching employees with attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMonthlyAttendance = async () => {
    if (!token) return

    try {
      setLoadingMonthly(true)
      const data = await apiService.getMonthlyAttendance(token, selectedYear, selectedMonth)
      setMonthlyAttendance(data)
    } catch (error) {
      console.error('Error fetching monthly attendance:', error)
    } finally {
      setLoadingMonthly(false)
    }
  }

  const fetchUpcomingLeaves = async () => {
    if (!token || !isHR) return

    try {
      setLoadingUpcomingLeaves(true)
      const data = await apiService.getUpcomingLeaves(token)
      setUpcomingLeaves(data)
    } catch (error) {
      console.error('Error fetching upcoming leaves:', error)
    } finally {
      setLoadingUpcomingLeaves(false)
    }
  }

  const handleMarkAttendance = async (employeeId: number, status: string) => {
    if (!token) return

    // Check if employee exists and validate hire date
    const employee = employees.find(emp => emp.id === employeeId)
    if (employee && (employee as any).hire_date) {
      const hireDate = new Date((employee as any).hire_date)
      const attendanceDate = new Date(selectedDate)
      if (attendanceDate < hireDate) {
        alert(`Cannot mark attendance before employee's joining date (${hireDate.toLocaleDateString()})`)
        return
      }
    }

    try {
      setUpdating(employeeId)
      await apiService.markAttendance({
        employee_id: employeeId,
        date: selectedDate,
        status: status,
      }, token)
      console.log(`✅ Attendance marked: Employee ${employeeId}, Status: ${status}, Date: ${selectedDate}`)
      
      // Refresh the list
      await fetchEmployeesWithAttendance()
      
      // Longer delay to ensure database is fully updated and committed
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Dispatch event to notify dashboard and other components
      // Use bubbles: true to ensure event propagates properly
      const event = new CustomEvent('attendanceUpdated', { 
        detail: { 
          employeeId, 
          status, 
          date: selectedDate 
        },
        bubbles: true,
        cancelable: true
      })
      // Dispatch on window (will bubble to document)
      window.dispatchEvent(event)
      console.log('📢 Attendance update event dispatched:', { employeeId, status, date: selectedDate })
      
      // Also use localStorage event as backup (works across tabs/components)
      const eventData = {
        employeeId,
        status,
        date: selectedDate,
        timestamp: Date.now()
      }
      // Set a unique value to trigger storage event
      localStorage.setItem('attendanceUpdated', JSON.stringify(eventData))
      // Change it slightly to ensure event fires
      localStorage.setItem('attendanceUpdated', JSON.stringify({ ...eventData, _trigger: Date.now() }))
      console.log('📢 LocalStorage event triggered as backup')
    } catch (error: any) {
      console.error('❌ Error marking attendance:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to mark attendance'
      alert(errorMessage)
    } finally {
      setUpdating(null)
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'absent':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'late':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'on_leave':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'present':
        return 'Present'
      case 'absent':
        return 'Absent'
      case 'late':
        return 'Late'
      case 'on_leave':
        return 'On Leave'
      default:
        return 'Not Marked'
    }
  }

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !isHR) return

    if (!leaveFormData.employee_id || !leaveFormData.start_date || !leaveFormData.end_date) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSubmittingLeave(true)
      const response = await apiService.createLeave({
        employee_id: parseInt(leaveFormData.employee_id),
        leave_type: leaveFormData.leave_type,
        start_date: leaveFormData.start_date,
        end_date: leaveFormData.end_date,
        reason: leaveFormData.reason || undefined
      }, token)
      
      console.log('✅ Leave created successfully:', response)
      alert('Leave added successfully!')
      setLeaveFormData({
        employee_id: '',
        leave_type: 'sick',
        start_date: '',
        end_date: '',
        reason: ''
      })
      setShowLeaveForm(false)
      // Refresh upcoming leaves
      await fetchUpcomingLeaves()
      // Dispatch event to notify dashboard and other components
      window.dispatchEvent(new CustomEvent('attendanceUpdated'))
    } catch (error: any) {
      console.error('❌ Error creating leave:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to submit leave request. Please try again.'
      alert(`Error: ${errorMessage}`)
    } finally {
      setSubmittingLeave(false)
    }
  }

  // Calculate stats
  const stats = {
    present: employees.filter(e => e.attendance_status === 'present').length,
    absent: employees.filter(e => e.attendance_status === 'absent').length,
    late: employees.filter(e => e.attendance_status === 'late').length,
    onLeave: employees.filter(e => e.attendance_status === 'on_leave').length,
  }

  // Helper functions for monthly view
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // Organize monthly attendance data by date and employee
  // Fix date parsing to avoid timezone issues
  const monthlyDataByDate = useMemo(() => {
    const dataMap = new Map<string, Map<number, any>>()
    
    monthlyAttendance.forEach((record: any) => {
      // Handle date parsing correctly to avoid timezone shifts
      let dateKey: string
      if (typeof record.date === 'string') {
        // If it's already in YYYY-MM-DD format, use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
          dateKey = record.date
        } else {
          // Parse the date and extract YYYY-MM-DD without timezone conversion
          const date = new Date(record.date)
          // Use local date components to avoid timezone issues
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          dateKey = `${year}-${month}-${day}`
        }
      } else if (record.date instanceof Date) {
        // If it's a Date object, extract local date components
        const year = record.date.getFullYear()
        const month = String(record.date.getMonth() + 1).padStart(2, '0')
        const day = String(record.date.getDate()).padStart(2, '0')
        dateKey = `${year}-${month}-${day}`
      } else {
        // Fallback to ISO string but extract date part only
        dateKey = new Date(record.date).toISOString().split('T')[0]
      }
      
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, new Map())
      }
      dataMap.get(dateKey)!.set(record.employee_id, record)
    })
    
    return dataMap
  }, [monthlyAttendance])

  // Get all unique employees from monthly data
  const monthlyEmployees = useMemo(() => {
    const employeeMap = new Map<number, any>()
    monthlyAttendance.forEach((record: any) => {
      if (!employeeMap.has(record.employee_id)) {
        employeeMap.set(record.employee_id, {
          id: record.employee_id,
          first_name: record.first_name,
          last_name: record.last_name,
          emp_id: record.emp_id,
          department: record.department,
          position: record.position
        })
      }
    })
    return Array.from(employeeMap.values())
  }, [monthlyAttendance])

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 1) {
        setSelectedMonth(12)
        setSelectedYear(selectedYear - 1)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    } else {
      if (selectedMonth === 12) {
        setSelectedMonth(1)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 overflow-x-hidden max-w-full"
      >
        <div className="flex-1 min-w-0 overflow-x-hidden">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 gradient-text truncate">Attendance Tracking</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">Monitor employee attendance and time tracking</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 border rounded-lg p-1 bg-white/5">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('daily')}
              className="flex-1"
            >
              Daily
            </Button>
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('monthly')}
              className="flex-1"
            >
              Monthly
            </Button>
          </div>
          
          {viewMode === 'daily' ? (
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full sm:w-auto"
            />
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('prev')}
                className="p-1.5 sm:p-2"
              >
                <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
              </Button>
              <div className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border bg-white/5 min-w-[100px] sm:min-w-[150px] text-center text-xs sm:text-sm">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('next')}
                disabled={selectedMonth === new Date().getMonth() + 1 && selectedYear === new Date().getFullYear()}
                className="p-1.5 sm:p-2"
              >
                <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
              </Button>
            </div>
          )}
          
          {isHR && (
            <Button
              onClick={() => setShowLeaveForm(!showLeaveForm)}
              variant="outline"
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Calendar size={18} />
              <span className="hidden sm:inline">{showLeaveForm ? 'Hide Leave Form' : 'Add Leave'}</span>
              <span className="sm:hidden">{showLeaveForm ? 'Hide' : 'Add Leave'}</span>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Leave Form */}
      {isHR && showLeaveForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  Add Upcoming Leave
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLeaveForm(false)}
                >
                  <X size={18} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitLeave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Employee *</label>
                  <select
                    value={leaveFormData.employee_id}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, employee_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {allEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Leave Type *</label>
                  <select
                    value={leaveFormData.leave_type}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, leave_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="sick">Sick Leave</option>
                    <option value="vacation">Vacation</option>
                    <option value="personal">Personal</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date *</label>
                  <Input
                    type="date"
                    value={leaveFormData.start_date}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, start_date: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">End Date *</label>
                  <Input
                    type="date"
                    value={leaveFormData.end_date}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, end_date: e.target.value })}
                    required
                    min={leaveFormData.start_date || new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-1">
                  <label className="text-sm font-medium mb-2 block">Reason</label>
                  <Input
                    type="text"
                    value={leaveFormData.reason}
                    onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                    placeholder="Enter reason (optional)"
                    className="w-full"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-5 flex justify-end">
                  <Button
                    type="submit"
                    disabled={submittingLeave}
                    className="min-w-[100px] sm:min-w-[120px]"
                  >
                    {submittingLeave ? 'Submitting...' : 'Submit Leave'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Upcoming Leaves Section - Only for employees in attendance list */}
      {isHR && viewMode === 'daily' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {!showUpcomingLeaves ? (
            <Card 
              variant="glass" 
              className="cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => {
                setShowUpcomingLeaves(true)
                if (upcomingLeaves.length === 0) {
                  fetchUpcomingLeaves()
                }
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Calendar className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Upcoming Leaves</h3>
                      <p className="text-sm text-muted-foreground">Click to view upcoming leaves for employees</p>
                    </div>
                  </div>
                  {(() => {
                    const employeeIds = employees.map(emp => emp.id)
                    const filteredLeaves = upcomingLeaves.filter(leave => 
                      employeeIds.includes(leave.employee_id)
                    )
                    if (filteredLeaves.length > 0) {
                      return (
                        <Badge variant="default" className="text-sm px-3 py-1">
                          {filteredLeaves.length} {filteredLeaves.length === 1 ? 'Leave' : 'Leaves'}
                        </Badge>
                      )
                    }
                    return null
                  })()}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card variant="glass">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar size={20} />
                    Upcoming Leaves
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpcomingLeaves(false)}
                  >
                    <X size={18} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingUpcomingLeaves ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (() => {
                  // Filter upcoming leaves to only show those for employees in the attendance list
                  const employeeIds = employees.map(emp => emp.id)
                  const filteredLeaves = upcomingLeaves.filter(leave => 
                    employeeIds.includes(leave.employee_id)
                  )

                  if (filteredLeaves.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Calendar className="mx-auto mb-4 text-muted-foreground" size={48} />
                        <p className="text-muted-foreground">No upcoming leaves for employees in attendance list</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-3">
                      {filteredLeaves.map((leave) => {
                        const startDate = new Date(leave.start_date)
                        const endDate = new Date(leave.end_date)
                        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                        
                        return (
                          <div
                            key={leave.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg glass hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                {leave.first_name?.[0]}{leave.last_name?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">
                                  {leave.first_name} {leave.last_name}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {leave.emp_id}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({daysDiff} {daysDiff === 1 ? 'day' : 'days'})
                                  </span>
                                </div>
                                {leave.reason && (
                                  <p className="text-sm text-muted-foreground mt-1 truncate">
                                    {leave.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant="secondary" className="capitalize w-fit">
                              {leave.leave_type}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Present Today', value: stats.present, icon: CheckCircle, color: 'green' },
          { label: 'Absent Today', value: stats.absent, icon: XCircle, color: 'red' },
          { label: 'Late Arrivals', value: stats.late, icon: Clock, color: 'yellow' },
          { label: 'On Leave', value: stats.onLeave, icon: Users, color: 'blue' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="glass" className="hover:scale-105 transition-transform">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`text-${stat.color}-400`} size={32} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Monthly View */}
      {viewMode === 'monthly' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Card variant="glass" className="overflow-visible">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 border-b border-white/10">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Calendar className="text-white" size={20} />
                  </div>
                  <div>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {monthNames[selectedMonth - 1]} {selectedYear}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">Monthly Attendance Overview</p>
                  </div>
                </div>
                <Badge variant="default" className="text-xs px-3 py-1.5 shadow-lg shadow-blue-500/20">
                  <Users size={14} className="mr-1.5" />
                  {monthlyEmployees.length} {monthlyEmployees.length === 1 ? 'Employee' : 'Employees'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-visible">
              {loadingMonthly ? (
                <div className="p-6">
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              ) : (
                <div 
                  className="overflow-x-auto w-full" 
                  style={{ 
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                    msOverflowStyle: 'auto'
                  }}
                >
                  <div className="inline-block align-middle">
                    <div className="rounded-b-xl">
                      <table 
                        className="border-collapse text-xs sm:text-sm" 
                        style={{ 
                          minWidth: `${200 + (getDaysInMonth(selectedYear, selectedMonth) * 55)}px`,
                          maxWidth: 'none',
                          width: 'auto',
                          tableLayout: 'fixed'
                        }}
                      >
                        <thead>
                          <tr className="bg-gradient-to-r from-white/90 via-white/80 to-white/90 dark:from-gray-800/90 dark:via-gray-800/80 dark:to-gray-800/90 backdrop-blur-sm border-b-2 border-gray-200 dark:border-white/10">
                            <th className="sticky left-0 z-20 bg-gradient-to-r from-white/95 to-white/90 dark:from-gray-800/95 dark:to-gray-800/90 backdrop-blur-md border-r-2 border-gray-200 dark:border-white/10 p-2 sm:p-4 text-left min-w-[150px] sm:min-w-[200px] md:min-w-[240px] shadow-xl">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                                  <Users size={16} className="text-white" />
                                </div>
                                <span className="font-bold text-sm text-gray-900 dark:text-white">Employee</span>
                              </div>
                            </th>
                            {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => {
                              const day = i + 1
                              const date = new Date(selectedYear, selectedMonth - 1, day)
                              const isToday = date.toDateString() === new Date().toDateString()
                              const isFuture = date > new Date()
                              const isWeekend = date.getDay() === 0 || date.getDay() === 6
                              
                              return (
                                <th
                                  key={day}
                                  className={`border-r border-gray-200/50 dark:border-white/5 p-2.5 text-center min-w-[55px] max-w-[55px] transition-all ${
                                    isToday 
                                      ? 'bg-gradient-to-b from-blue-500/40 to-blue-600/30 border-blue-400/50 shadow-lg shadow-blue-500/20' 
                                      : isWeekend 
                                      ? 'bg-gray-100/50 dark:bg-gray-800/30' 
                                      : 'bg-white/50 dark:bg-gray-800/20 hover:bg-gray-100/70 dark:hover:bg-gray-800/30'
                                  } ${isFuture ? 'opacity-40' : ''}`}
                                >
                                  <div className={`text-xs font-bold ${isToday ? 'text-blue-700 dark:text-blue-200' : 'text-gray-900 dark:text-white/90'}`}>
                                    {day}
                                  </div>
                                  <div className={`text-[10px] mt-1 font-medium ${
                                    isToday ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-white/60'
                                  }`}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                  </div>
                                </th>
                              )
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyEmployees.length === 0 ? (
                            <tr>
                              <td 
                                colSpan={getDaysInMonth(selectedYear, selectedMonth) + 1} 
                                className="text-center py-16 bg-gradient-to-b from-gray-50/50 to-white/30 dark:from-gray-900/50 dark:to-gray-900/30"
                              >
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                                    <Users className="text-blue-400/50" size={32} />
                                  </div>
                                  <p className="text-muted-foreground font-medium">No attendance records found for this month</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            monthlyEmployees.map((employee, empIndex) => {
                              return (
                                <tr 
                                  key={employee.id} 
                                  className={`group transition-all duration-200 ${
                                    empIndex % 2 === 0 
                                      ? 'bg-gradient-to-r from-white/60 via-white/40 to-white/60 dark:from-gray-900/40 dark:via-gray-900/30 dark:to-gray-900/40' 
                                      : 'bg-gradient-to-r from-white/40 via-white/20 to-white/40 dark:from-gray-900/20 dark:via-gray-900/10 dark:to-gray-900/20'
                                  } hover:from-white/80 hover:via-white/60 hover:to-white/80 dark:hover:from-gray-800/50 dark:hover:via-gray-800/40 dark:hover:to-gray-800/50`}
                                >
                                  <td className="sticky left-0 z-10 bg-gradient-to-r from-white/95 via-white/90 to-white/95 dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-900/95 backdrop-blur-md border-r-2 border-gray-200 dark:border-white/10 border-b border-gray-200/50 dark:border-white/5 p-2 sm:p-4 shadow-xl group-hover:from-white/98 group-hover:via-white/95 group-hover:to-white/98 dark:group-hover:from-gray-800/95 dark:group-hover:via-gray-800/90 dark:group-hover:to-gray-800/95 min-w-[120px] sm:min-w-[150px] md:min-w-[200px]">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20">
                                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div 
                                          className="font-bold text-xs sm:text-sm truncate text-gray-900 dark:text-white mb-0.5 cursor-pointer hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                                          onClick={() => navigate(`/dashboard/employee/${employee.id}`)}
                                        >
                                          {employee.first_name} {employee.last_name}
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-white/60 truncate flex items-center gap-1 sm:gap-1.5">
                                          <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-3 sm:h-4">
                                            {employee.emp_id}
                                          </Badge>
                                          <span className="hidden sm:inline">•</span>
                                          <span className="truncate">{employee.department || 'N/A'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  {Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => {
                                    const day = i + 1
                                    const dateKey = formatDateKey(selectedYear, selectedMonth, day)
                                    const cellDate = new Date(selectedYear, selectedMonth - 1, day)
                                    const isFuture = cellDate > new Date()
                                    const isToday = cellDate.toDateString() === new Date().toDateString()
                                    const isWeekendDay = cellDate.getDay() === 0 || cellDate.getDay() === 6
                                    const attendance = monthlyDataByDate.get(dateKey)?.get(employee.id)
                                    const status = attendance?.status || null
                                    
                                    return (
                                      <td
                                        key={day}
                                        className={`border-r border-b border-gray-200/50 dark:border-white/5 p-2 text-center transition-all ${
                                          isFuture ? 'opacity-30 bg-gray-100/30 dark:bg-gray-900/20' : ''
                                        } ${isWeekendDay && !isFuture ? 'bg-gray-100/40 dark:bg-gray-800/15' : ''} ${
                                          isToday ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : ''
                                        } group-hover:bg-gray-100/50 dark:group-hover:bg-white/5`}
                                      >
                                        {isFuture ? (
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-200/50 dark:bg-gray-800/30">
                                            <span className="text-[10px] text-gray-400 dark:text-white/30">-</span>
                                          </div>
                                        ) : status ? (
                                          <div className="flex items-center justify-center">
                                            <div
                                              className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shadow-lg transition-all hover:scale-125 cursor-help ${
                                                status === 'present'
                                                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white border-2 border-green-400/50 shadow-green-500/30'
                                                  : status === 'absent'
                                                  ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white border-2 border-red-400/50 shadow-red-500/30'
                                                  : status === 'late'
                                                  ? 'bg-gradient-to-br from-yellow-500 to-amber-600 text-white border-2 border-yellow-400/50 shadow-yellow-500/30'
                                                  : status === 'on_leave'
                                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 shadow-blue-500/30'
                                                  : 'bg-gradient-to-br from-gray-500 to-gray-600 text-white border-2 border-gray-400/50 shadow-gray-500/30'
                                              }`}
                                              title={`${getStatusLabel(status)} - ${day} ${monthNames[selectedMonth - 1]}`}
                                            >
                                              {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'OL'}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-200/30 dark:bg-gray-800/20 border border-gray-300/50 dark:border-white/5">
                                            <span className="text-[10px] text-gray-400 dark:text-white/30">-</span>
                                          </div>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Legend */}
          <Card variant="glass" className="bg-gradient-to-r from-white/60 via-white/40 to-white/60 dark:from-gray-800/40 dark:via-gray-800/30 dark:to-gray-800/40 border-gray-200 dark:border-white/10">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white border-2 border-green-400/50 shadow-lg shadow-green-500/30 flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110">
                    P
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Present</span>
                </div>
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 text-white border-2 border-red-400/50 shadow-lg shadow-red-500/30 flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110">
                    A
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Absent</span>
                </div>
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 text-white border-2 border-yellow-400/50 shadow-lg shadow-yellow-500/30 flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110">
                    L
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">Late</span>
                </div>
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-2 border-blue-400/50 shadow-lg shadow-blue-500/30 flex items-center justify-center text-xs font-bold transition-transform group-hover:scale-110">
                    OL
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">On Leave</span>
                </div>
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-gray-200/60 dark:bg-gray-800/40 border-2 border-gray-300/50 dark:border-white/10 flex items-center justify-center">
                    <span className="text-[10px] text-gray-500 dark:text-white/40">-</span>
                  </div>
                  <span className="font-semibold text-gray-700 dark:text-white/60">Not Marked</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Daily View - Employee List with Attendance Options */}
      {viewMode === 'daily' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Employee Attendance - {new Date(selectedDate).toLocaleDateString()}</CardTitle>
            </CardHeader>
            <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </div>
                ))}
              </div>
            ) : employees.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="text-muted-foreground text-lg">No employees found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {employees.map((employee, index) => (
                  <motion.div
                    key={employee.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-lg glass hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 
                            className="font-semibold truncate cursor-pointer hover:text-blue-400 transition-colors"
                            onClick={() => navigate(`/dashboard/employee/${employee.id}`)}
                          >
                            {employee.first_name} {employee.last_name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">{employee.employee_id}</Badge>
                          {employee.department && (
                            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">{employee.department}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {employee.position} {employee.email && <span className="hidden md:inline">• {employee.email}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={getStatusColor(employee.attendance_status)}>
                        {getStatusLabel(employee.attendance_status)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
                      <Button
                        size="sm"
                        variant={employee.attendance_status === 'present' ? 'default' : 'outline'}
                        onClick={() => handleMarkAttendance(employee.id, 'present')}
                        disabled={updating === employee.id}
                        className="flex-1 md:flex-none min-w-[70px] md:min-w-[80px] text-xs md:text-sm"
                      >
                        {updating === employee.id ? '...' : 'Present'}
                      </Button>
                      <Button
                        size="sm"
                        variant={employee.attendance_status === 'absent' ? 'default' : 'outline'}
                        onClick={() => handleMarkAttendance(employee.id, 'absent')}
                        disabled={updating === employee.id}
                        className="flex-1 md:flex-none min-w-[70px] md:min-w-[80px] text-xs md:text-sm"
                      >
                        {updating === employee.id ? '...' : 'Absent'}
                      </Button>
                      <Button
                        size="sm"
                        variant={employee.attendance_status === 'late' ? 'default' : 'outline'}
                        onClick={() => handleMarkAttendance(employee.id, 'late')}
                        disabled={updating === employee.id}
                        className="flex-1 md:flex-none min-w-[70px] md:min-w-[80px] text-xs md:text-sm"
                      >
                        {updating === employee.id ? '...' : 'Late'}
                      </Button>
                      <Button
                        size="sm"
                        variant={employee.attendance_status === 'on_leave' ? 'default' : 'outline'}
                        onClick={() => handleMarkAttendance(employee.id, 'on_leave')}
                        disabled={updating === employee.id}
                        className="flex-1 md:flex-none min-w-[80px] md:min-w-[100px] text-xs md:text-sm"
                      >
                        {updating === employee.id ? '...' : 'On Leave'}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      )}
    </div>
  )
}
