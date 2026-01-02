import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, 
  Briefcase, User, TrendingUp, DollarSign
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
  const [payrollHistory, setPayrollHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [payrollLoading, setPayrollLoading] = useState(true)

  useEffect(() => {
    if (id && token) {
      fetchEmployee()
      fetchAttendance()
      fetchPayrollHistory()
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
      // Get last 30 days of attendance
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const startDateStr = startDate.toISOString().split('T')[0]
      
      const data = await apiService.getEmployeeAttendance(token, parseInt(id), startDateStr, endDate)
      setAttendance(data)
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  const fetchPayrollHistory = async () => {
    if (!token || !id) return

    try {
      setPayrollLoading(true)
      const employeeId = parseInt(id)
      
      // Fetch all payroll records for this employee
      const data = await apiService.getPayrolls(token, undefined, undefined, employeeId)
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        setPayrollHistory([])
        return
      }
      
      // Map payroll records to simple format with month, year, and status
      // Show ALL records - both paid and unpaid
      const payrollRecords = data
        .map((payroll: any) => {
          // Determine payment status - check multiple possible fields
          let paymentStatus = 'unpaid'
          
          // Check payment_status first
          if (payroll.payment_status) {
            const status = String(payroll.payment_status).toLowerCase().trim()
            paymentStatus = (status === 'paid') ? 'paid' : 'unpaid'
          } 
          // Then check status field
          else if (payroll.status) {
            const status = String(payroll.status).toLowerCase().trim()
            paymentStatus = (status === 'paid') ? 'paid' : 'unpaid'
          }
          
          return {
            month: payroll.month,
            year: payroll.year,
            payment_status: paymentStatus,
            id: payroll.id || payroll.payroll_id
          }
        })
        .filter((record: any) => record.month && record.year) // Filter out invalid records
      
      // Sort by year and month (newest first)
      const sorted = payrollRecords.sort((a: any, b: any) => {
        if (b.year !== a.year) return b.year - a.year
        return b.month - a.month
      })
      
      setPayrollHistory(sorted)
    } catch (error) {
      console.error('Error fetching payroll history:', error)
      setPayrollHistory([])
    } finally {
      setPayrollLoading(false)
    }
  }

  const getPaymentStatusColor = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'unpaid':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
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
        <p className="text-muted-foreground text-base">Employee not found</p>
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
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text">Employee Profile</h1>
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
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 break-words">
                      {employee.first_name} {employee.last_name}
                    </h2>
                    <p className="text-muted-foreground text-sm sm:text-base">{employee.employee_id}</p>
                  </div>
                  <Badge 
                    variant={employee.status === 'active' ? 'success' : 'destructive'}
                    className="text-sm flex-shrink-0"
                  >
                    {employee.status || 'active'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {employee.email && (
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-muted-foreground" />
                      <span className="text-sm sm:text-base">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-muted-foreground" />
                      <span className="text-sm sm:text-base">{employee.phone}</span>
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center gap-3">
                      <Briefcase size={16} className="text-muted-foreground" />
                      <span className="text-sm sm:text-base">{employee.department}</span>
                    </div>
                  )}
                  {employee.position && (
                    <div className="flex items-center gap-3">
                      <User size={16} className="text-muted-foreground" />
                      <span className="text-sm sm:text-base">{employee.position}</span>
                    </div>
                  )}
                  {employee.hire_date && (
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-muted-foreground" />
                      <span className="text-sm sm:text-base">
                        Hired: {new Date(employee.hire_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {employee.salary && (
                    <div className="flex items-center gap-3">
                      <span className="text-sm sm:text-base">₹{Number(employee.salary).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {employee.address && (
                    <div className="flex items-center gap-3 md:col-span-2">
                      <MapPin size={16} className="text-muted-foreground" />
                      <span className="text-sm sm:text-base">{employee.address}</span>
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
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp size={18} />
              Attendance Overview (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
              <div className="text-center p-3 sm:p-4 rounded-lg bg-green-500/20 border border-green-500/30">
                <p className="text-lg sm:text-xl font-bold text-green-400">{attendanceStats.present}</p>
                <p className="text-sm text-muted-foreground mt-1">Present</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-red-500/20 border border-red-500/30">
                <p className="text-lg sm:text-xl font-bold text-red-400">{attendanceStats.absent}</p>
                <p className="text-sm text-muted-foreground mt-1">Absent</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                <p className="text-lg sm:text-xl font-bold text-yellow-400">{attendanceStats.late}</p>
                <p className="text-sm text-muted-foreground mt-1">Late</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <p className="text-lg sm:text-xl font-bold text-black dark:text-white">{attendanceStats.onLeave}</p>
                <p className="text-sm text-muted-foreground mt-1">On Leave</p>
              </div>
              <div className="text-center p-3 sm:p-4 rounded-lg bg-gray-500/20 border border-gray-500/30">
                <p className="text-lg sm:text-xl font-bold text-gray-400">{attendanceStats.total}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <DollarSign size={18} />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payrollLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : payrollHistory.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="mx-auto mb-4 text-muted-foreground" size={48} />
                <p className="text-base text-muted-foreground mb-2">No payment records found</p>
                <p className="text-sm text-muted-foreground">Create payroll records in Payroll Management to see payment history here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 text-sm font-semibold">Month</th>
                      <th className="text-left p-3 text-sm font-semibold">Year</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollHistory.map((payroll, index) => {
                      const paymentStatus = payroll.payment_status || payroll.status || 'unpaid'
                      const monthName = payroll.month 
                        ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][payroll.month - 1]
                        : 'N/A'
                      
                  return (
                        <motion.tr
                          key={payroll.id || payroll.payroll_id || index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                          className="border-b border-gray-200/50 dark:border-gray-700/50 transition-colors"
                    >
                          <td className="p-3 text-sm sm:text-base">{monthName}</td>
                          <td className="p-3 text-sm sm:text-base">{payroll.year || 'N/A'}</td>
                          <td className="p-3">
                            <Badge className={`${getPaymentStatusColor(paymentStatus)} text-sm`}>
                              {paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'unpaid' ? 'Unpaid' : paymentStatus}
                      </Badge>
                          </td>
                        </motion.tr>
                  )
                })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}


