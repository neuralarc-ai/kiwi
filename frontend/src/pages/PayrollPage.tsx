import { motion } from 'framer-motion'
import { IndianRupee, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService, type Payroll } from '@/services/api'

export default function PayrollPage() {
  const { user, token } = useAuth()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const isAdmin = user?.role === 'admin' || user?.role === 'hr_executive'

  const fetchPayrolls = async () => {
    if (!token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const data = await apiService.getPayrolls(token, selectedMonth, selectedYear, undefined, true)
      const payrollData = Array.isArray(data) ? data : []
      
      // Debug: Log leave deductions
      payrollData.forEach((p: Payroll) => {
        if (p.leave_deduction !== undefined && p.leave_deduction !== null) {
          console.log(`💰 Payroll for ${p.first_name} ${p.last_name}: Leave deduction = ₹${p.leave_deduction}, Salary = ₹${p.basic_salary || p.salary}`)
        }
      })
      
      setPayrolls(payrollData)
    } catch (err: any) {
      console.error('Error fetching payrolls:', err)
      const errorMessage = err?.message || err?.toString() || 'Failed to load payrolls'
      setError(errorMessage)
      setPayrolls([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayrolls()
  }, [token, selectedMonth, selectedYear])

  // Listen for leave updates to refresh payroll
  useEffect(() => {
    const handleLeaveUpdate = async () => {
      console.log('🔄 Leave update detected, refreshing payroll...')
      // Wait a bit for backend to process
      setTimeout(() => {
        fetchPayrolls()
      }, 500)
    }

    // Listen for attendance/leave updates
    window.addEventListener('attendanceUpdated', handleLeaveUpdate)
    document.addEventListener('attendanceUpdated', handleLeaveUpdate)

    // Also listen for storage events (cross-tab updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'payrollUpdated' || e.key === 'leaveUpdated') {
        console.log('🔄 Storage event detected, refreshing payroll...')
        fetchPayrolls()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Polling for updates every 5 seconds
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && !loading) {
        fetchPayrolls()
      }
    }, 5000)

    return () => {
      window.removeEventListener('attendanceUpdated', handleLeaveUpdate)
      document.removeEventListener('attendanceUpdated', handleLeaveUpdate)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(pollInterval)
    }
  }, [token, selectedMonth, selectedYear])

  const filteredPayrolls = useMemo(() => {
    let filtered = payrolls

    if (statusFilter === 'paid') {
      filtered = filtered.filter(p => p.payment_status === 'paid' || p.status === 'paid')
    } else if (statusFilter === 'unpaid') {
      filtered = filtered.filter(p => p.payment_status !== 'paid' && p.status !== 'paid')
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(payroll => 
        payroll.first_name?.toLowerCase().includes(query) ||
        payroll.last_name?.toLowerCase().includes(query) ||
        payroll.emp_id?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [payrolls, searchQuery, statusFilter])

  const getStatusColor = (status?: string) => {
    if (status === 'paid') {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  }

  const getMonthName = (month: number) => {
    const date = new Date(2000, month - 1, 1)
    return date.toLocaleString('default', { month: 'long' })
  }

  const isPaid = (payroll: Payroll) => {
    return payroll.payment_status === 'paid' || payroll.status === 'paid'
  }

  const handleStatusChange = async (payroll: Payroll, newStatus: string) => {
    if (!token || !isAdmin) {
      setError('Authentication required')
      return
    }

    if (!payroll.employee_id || !selectedMonth || !selectedYear) {
      setError('Please select a month and year')
      return
    }

    try {
      setError('') // Clear previous errors
      
      if (payroll.payroll_id || payroll.id) {
        // Update existing payroll
        await apiService.updatePayroll(payroll.payroll_id || payroll.id!, { status: newStatus }, token)
      } else {
        // Create new payroll record - backend will use employee's salary from database if not provided
        await apiService.createPayroll({
          employee_id: payroll.employee_id,
          month: selectedMonth,
          year: selectedYear,
          basic_salary: payroll.salary || payroll.basic_salary || 0, // Will use employee's salary from DB if 0
          allowances: 0,
          deductions: 0,
          status: newStatus
        }, token)
      }
      
      // Refresh the payroll list
      await fetchPayrolls()
      setError('')
    } catch (err: any) {
      console.error('Error updating payment status:', err)
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to update payment status'
      setError(errorMessage)
      
      // Show error for a few seconds then clear
      setTimeout(() => {
        setError('')
      }, 5000)
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Payroll Management</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Manage employee salaries and payments</p>
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

      <Card variant="glass" className="p-3 sm:p-4 overflow-x-hidden max-w-full">
        <div className="flex flex-col gap-3 sm:gap-4 overflow-x-hidden max-w-full">
          {/* Search Employee */}
          <div className="w-full min-w-0">
            <label className="text-xs sm:text-sm font-medium mb-2 block">Search Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                variant="glass"
                placeholder="Search by employee name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full text-sm"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-x-hidden max-w-full">
            {/* Payment Status */}
            <div className="w-full sm:w-auto sm:flex-shrink-0 min-w-0">
              <label className="text-xs sm:text-sm font-medium mb-2 block">Payment Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-[140px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800/50 dark:border-gray-700 text-xs sm:text-sm"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            {/* Month */}
            <div className="w-full sm:w-auto sm:flex-shrink-0 min-w-0">
              <label className="text-xs sm:text-sm font-medium mb-2 block">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full sm:w-[140px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800/50 dark:border-gray-700 text-xs sm:text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="w-full sm:w-auto sm:flex-shrink-0 min-w-0">
              <label className="text-xs sm:text-sm font-medium mb-2 block">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full sm:w-[100px] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800/50 dark:border-gray-700 text-xs sm:text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="glass" className="overflow-x-hidden max-w-full">
        <CardHeader className="overflow-x-hidden max-w-full">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <IndianRupee size={20} />
            Employee Payroll Status - {getMonthName(selectedMonth)} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-hidden max-w-full">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className="text-center py-12">
              <IndianRupee size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg">No employees found</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-x-hidden">
              {filteredPayrolls.map((payroll, index) => (
                <motion.div
                  key={payroll.employee_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 rounded-lg glass hover:bg-white/5 transition-colors overflow-x-hidden max-w-full"
                >
                  {/* Paid/Unpaid Filter in front */}
                  <div className="flex-shrink-0">
                    {isAdmin ? (
                      <select
                        value={isPaid(payroll) ? 'paid' : 'unpaid'}
                        onChange={(e) => {
                          const newValue = e.target.value
                          const isCurrentlyPaid = isPaid(payroll)
                          const newStatus = newValue === 'paid' ? 'paid' : 'processed'
                          
                          // Only update if status actually changed
                          if ((newValue === 'paid' && !isCurrentlyPaid) || (newValue === 'unpaid' && isCurrentlyPaid)) {
                            const employeeName = `${payroll.first_name} ${payroll.last_name}`
                            if (confirm(`Mark salary as ${newValue} for ${employeeName}?`)) {
                              handleStatusChange(payroll, newStatus)
                            } else {
                              // Reset select to original value if cancelled
                              e.target.value = isCurrentlyPaid ? 'paid' : 'unpaid'
                            }
                          }
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-xs font-medium min-w-[90px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          isPaid(payroll)
                            ? 'bg-green-600 text-white border-green-700 hover:bg-green-700'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-900/30'
                        }`}
                      >
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    ) : (
                      <Badge className={getStatusColor(isPaid(payroll) ? 'paid' : 'unpaid')}>
                        {isPaid(payroll) ? '✓ Paid' : '✗ Unpaid'}
                      </Badge>
                    )}
                  </div>

                  {/* Employee Avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-xs sm:text-sm">
                    {payroll.first_name?.[0]}{payroll.last_name?.[0]}
                  </div>

                  {/* Employee Info */}
                  <div className="flex-1 min-w-0 max-w-[200px] sm:max-w-none">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-semibold text-xs sm:text-sm truncate">
                        {payroll.first_name} {payroll.last_name}
                      </h3>
                      {payroll.emp_id && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">{payroll.emp_id}</Badge>
                      )}
                      {payroll.department && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">{payroll.department}</Badge>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                      {payroll.position || 'Employee'}
                      {payroll.email && ` • ${payroll.email}`}
                    </p>
                  </div>

                  {/* Salary Breakdown - Always show for all employees */}
                  <div className="w-full sm:w-auto sm:flex-shrink-0 overflow-x-hidden max-w-full">
                    {/* Desktop View */}
                    <div className="hidden md:flex items-center gap-2 border-l border-gray-200 dark:border-gray-700 pl-2 max-w-full overflow-x-hidden">
                      <div className="text-right space-y-1 w-full max-w-[180px] min-w-0">
                        <div className="flex items-center justify-between gap-1.5 min-w-0">
                          <span className="text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0">Basic:</span>
                          <span className="font-medium text-xs sm:text-sm truncate">₹{(payroll.basic_salary || payroll.salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {payroll.allowances !== undefined && payroll.allowances !== null && payroll.allowances !== 0 && (
                          <div className={`flex items-center justify-between gap-1.5 min-w-0 ${payroll.allowances > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            <span className="text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0">Allow:</span>
                            <span className="font-medium text-xs sm:text-sm truncate">{payroll.allowances > 0 ? '+' : ''}₹{Math.abs(payroll.allowances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {/* Always show leave deduction with actual value */}
                        <div className={`flex items-center justify-between gap-1.5 min-w-0 ${(payroll.leave_deduction || 0) > 0 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-muted-foreground'}`}>
                          <span className="text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0">Leave:</span>
                          <span className={`font-medium text-xs sm:text-sm truncate ${(payroll.leave_deduction || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                            {(payroll.leave_deduction || 0) > 0 ? '-' : ''}₹{Math.abs(payroll.leave_deduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {(payroll.leave_deduction || 0) === 0 && <span className="text-[10px] ml-0.5">(≤2)</span>}
                          </span>
                        </div>
                        {payroll.deductions !== undefined && payroll.deductions !== null && (payroll.deductions - (payroll.leave_deduction || 0)) > 0 && (
                          <div className="flex items-center justify-between gap-1.5 min-w-0 text-red-600 dark:text-red-400">
                            <span className="text-muted-foreground text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0">Other:</span>
                            <span className="font-medium text-xs sm:text-sm truncate">-₹{Math.max(0, (payroll.deductions || 0) - (payroll.leave_deduction || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-1.5 min-w-0 pt-1.5 border-t border-gray-300 dark:border-gray-600 mt-1.5">
                          <span className="font-bold text-xs sm:text-sm flex-shrink-0">Net:</span>
                          <span className="font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400 truncate">₹{(payroll.net_salary || (payroll.basic_salary || payroll.salary || 0) + (payroll.allowances || 0) - (payroll.deductions || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                    {/* Mobile View */}
                    <div className="md:hidden w-full mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">Basic Salary:</span>
                          <span className="font-medium">₹{(payroll.basic_salary || payroll.salary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {payroll.allowances !== undefined && payroll.allowances !== null && payroll.allowances !== 0 && (
                          <div className={`flex items-center justify-between ${payroll.allowances > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            <span className="text-muted-foreground text-xs">Allowances:</span>
                            <span className="font-medium">{payroll.allowances > 0 ? '+' : ''}₹{Math.abs(payroll.allowances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {/* Always show leave deduction with actual value */}
                        <div className={`flex items-center justify-between ${(payroll.leave_deduction || 0) > 0 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-muted-foreground'}`}>
                          <span className="text-muted-foreground text-xs">Leave Deduction:</span>
                          <span className={`font-medium ${(payroll.leave_deduction || 0) > 0 ? 'text-orange-600 dark:text-orange-400' : ''}`}>
                            {(payroll.leave_deduction || 0) > 0 ? '-' : ''}₹{Math.abs(payroll.leave_deduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {(payroll.leave_deduction || 0) === 0 && <span className="text-xs ml-1">(≤2 leaves)</span>}
                          </span>
                        </div>
                        {payroll.deductions !== undefined && payroll.deductions !== null && (payroll.deductions - (payroll.leave_deduction || 0)) > 0 && (
                          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                            <span className="text-muted-foreground text-xs">Other Deductions:</span>
                            <span className="font-medium">-₹{Math.max(0, (payroll.deductions || 0) - (payroll.leave_deduction || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t-2 border-gray-300 dark:border-gray-600 mt-2">
                          <span className="font-bold">Net Salary:</span>
                          <span className="font-bold text-base text-blue-600 dark:text-blue-400">₹{(payroll.net_salary || (payroll.basic_salary || payroll.salary || 0) + (payroll.allowances || 0) - (payroll.deductions || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

