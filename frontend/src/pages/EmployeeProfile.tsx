import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, 
  Briefcase, User, Clock, CheckCircle, XCircle, AlertCircle,
  TrendingUp, CalendarCheck
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [employee, setEmployee] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceLoading, setAttendanceLoading] = useState(true)

  useEffect(() => {
    if (id && token) {
      fetchEmployee()
      fetchAttendance()
    }
  }, [id, token])

  const fetchEmployee = async () => {
    if (!token || !id) return

    try {
      setLoading(true)
      const data = await apiService.getEmployee(id, token)
      setEmployee(data)
    } catch (error) {
      console.error('Error fetching employee:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendance = async () => {
    if (!token || !id) return

    try {
      setAttendanceLoading(true)
      // Get last 30 days of attendance
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const startDateStr = startDate.toISOString().split('T')[0]
      
      const data = await apiService.getEmployeeAttendance(token, parseInt(id), startDateStr, endDate)
      setAttendance(data)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    } finally {
      setAttendanceLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return CheckCircle
      case 'absent':
        return XCircle
      case 'late':
        return AlertCircle
      case 'on_leave':
        return CalendarCheck
      default:
        return Clock
    }
  }

  const getStatusLabel = (status: string) => {
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

  // Calculate attendance stats
  const attendanceStats = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    onLeave: attendance.filter(a => a.status === 'on_leave').length,
    total: attendance.length
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">Employee not found</p>
        <Button onClick={() => navigate('/dashboard/employees')} className="mt-4">
          <ArrowLeft className="mr-2" size={18} />
          Back to Employees
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
      >
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <ArrowLeft size={18} />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold gradient-text">Employee Profile</h1>
        </div>
      </motion.div>

      {/* Employee Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="glass">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* Photo */}
              <div className="flex-shrink-0 flex justify-center sm:justify-start">
                {employee.profile_photo ? (
                  <img
                    src={employee.profile_photo}
                    alt={`${employee.first_name} ${employee.last_name}`}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-500/30 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl sm:text-4xl shadow-lg">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 break-words">
                      {employee.first_name} {employee.last_name}
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base md:text-lg">{employee.employee_id}</p>
                  </div>
                  <Badge 
                    variant={employee.status === 'active' ? 'success' : 'destructive'}
                    className="text-xs sm:text-sm flex-shrink-0"
                  >
                    {employee.status || 'active'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {employee.email && (
                    <div className="flex items-center gap-3">
                      <Mail size={18} className="text-muted-foreground" />
                      <span className="text-sm">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={18} className="text-muted-foreground" />
                      <span className="text-sm">{employee.phone}</span>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center gap-3">
                      <Briefcase size={18} className="text-muted-foreground" />
                      <span className="text-sm">{employee.department}</span>
                    </div>
                  )}
                  {employee.position && (
                    <div className="flex items-center gap-3">
                      <User size={18} className="text-muted-foreground" />
                      <span className="text-sm">{employee.position}</span>
                    </div>
                  )}
                  {employee.hire_date && (
                    <div className="flex items-center gap-3">
                      <Calendar size={18} className="text-muted-foreground" />
                      <span className="text-sm">
                        Hired: {new Date(employee.hire_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {employee.salary && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm">₹{Number(employee.salary).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {employee.address && (
                    <div className="flex items-center gap-3 md:col-span-2">
                      <MapPin size={18} className="text-muted-foreground" />
                      <span className="text-sm">{employee.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Attendance Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} />
              Attendance Overview (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-2xl sm:text-3xl font-bold text-green-400">{attendanceStats.present}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Present</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-2xl sm:text-3xl font-bold text-red-400">{attendanceStats.absent}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Absent</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{attendanceStats.late}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Late</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-2xl sm:text-3xl font-bold text-blue-400">{attendanceStats.onLeave}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">On Leave</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
                <p className="text-2xl sm:text-3xl font-bold text-gray-400">{attendanceStats.total}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Attendance History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck size={20} />
              Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : attendance.length === 0 ? (
              <div className="text-center py-12">
                <CalendarCheck className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="text-muted-foreground">No attendance records found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendance.map((record, index) => {
                  const StatusIcon = getStatusIcon(record.status)
                  return (
                    <motion.div
                      key={record.id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg glass hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                          <Calendar size={20} className="text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base break-words">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {record.check_in_time && (
                            <p className="text-xs sm:text-sm text-muted-foreground break-words">
                              Check-in: {new Date(record.check_in_time).toLocaleTimeString()}
                              {record.check_out_time && 
                                ` • Check-out: ${new Date(record.check_out_time).toLocaleTimeString()}`
                              }
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={getStatusColor(record.status)}>
                        <StatusIcon size={14} className="mr-1.5" />
                        {getStatusLabel(record.status)}
                      </Badge>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

