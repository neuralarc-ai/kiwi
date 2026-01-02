import { motion } from 'framer-motion'
import { IndianRupee, Search, Receipt, X, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService, type Payroll } from '@/services/api'
import PaymentReceipt from '@/components/PaymentReceipt'

export default function PayrollPage() {
  const { user, token } = useAuth()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedEmployeeForReceipt, setSelectedEmployeeForReceipt] = useState<{ payroll: Payroll } | null>(null)
  const isAdmin = user?.role === 'admin' || user?.role === 'hr_executive'

  // Debug: Log when selectedEmployeeForReceipt changes
  useEffect(() => {
    if (selectedEmployeeForReceipt) {
      console.log('✅ Modal should be visible. selectedEmployeeForReceipt:', selectedEmployeeForReceipt)
      console.log('✅ Payroll data:', selectedEmployeeForReceipt.payroll)
    } else {
      console.log('❌ Modal closed. selectedEmployeeForReceipt is null')
    }
  }, [selectedEmployeeForReceipt])

  const fetchPayrolls = useCallback(async () => {
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
  }, [token, selectedMonth, selectedYear])

  // Fetch payrolls when token, month, or year changes
  useEffect(() => {
    fetchPayrolls()
  }, [fetchPayrolls])

  // Listen for leave updates to refresh payroll (only on specific events, not polling)
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

    // Removed aggressive polling - page will only refresh on actual events
    // If you need periodic updates, consider increasing interval to 30-60 seconds
    // or use a manual refresh button instead

    return () => {
      window.removeEventListener('attendanceUpdated', handleLeaveUpdate)
      document.removeEventListener('attendanceUpdated', handleLeaveUpdate)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [fetchPayrolls])

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
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
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
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2">Payroll Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage employee salaries and payments</p>
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

      <Card variant="glass" className="p-5 overflow-x-hidden max-w-full">
        <div className="flex flex-col gap-4 overflow-x-hidden max-w-full">
          {/* Search Employee */}
          <div className="w-full min-w-0">
            <label className="text-sm font-medium mb-2 block">Search Employee</label>
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
          <div className="flex flex-col sm:flex-row gap-4 overflow-x-hidden max-w-full">
            {/* Payment Status */}
            <div className="w-full sm:w-auto sm:flex-shrink-0 min-w-0">
              <label className="text-sm font-medium mb-2 block">Payment Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-[140px] px-3 py-2 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800/50 dark:border-gray-700 text-sm"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            {/* Month */}
            <div className="w-full sm:w-auto sm:flex-shrink-0 min-w-0">
              <label className="text-sm font-medium mb-2 block">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full sm:w-[140px] px-3 py-2 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800/50 dark:border-gray-700 text-sm"
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
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg glass transition-colors overflow-x-hidden max-w-full"
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
                        className={`px-3 py-2 rounded-lg border text-sm font-medium min-w-[100px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                          isPaid(payroll)
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    ) : (
                      <Badge className={`${getStatusColor(isPaid(payroll) ? 'paid' : 'unpaid')} text-sm`}>
                        {isPaid(payroll) ? '✓ Paid' : '✗ Unpaid'}
                      </Badge>
                    )}
                  </div>

                  {/* Employee Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                    {payroll.first_name?.[0]}{payroll.last_name?.[0]}
                  </div>

                  {/* Employee Info */}
                  <div className="flex-1 min-w-0 max-w-[200px] sm:max-w-none">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-semibold text-sm truncate">
                        {payroll.first_name} {payroll.last_name}
                      </h3>
                      {payroll.emp_id && (
                        <Badge variant="secondary" className="text-xs">{payroll.emp_id}</Badge>
                      )}
                      {payroll.department && (
                        <Badge variant="secondary" className="text-xs">{payroll.department}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {payroll.position || 'Employee'}
                      {payroll.email && ` • ${payroll.email}`}
                    </p>
                  </div>

                  {/* Payslip Button - All details shown only in payslip */}
                  <div className="w-full sm:w-auto sm:flex-shrink-0 flex items-center justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('🔵 Payslip button clicked for:', payroll)
                        console.log('🔵 Payroll data:', JSON.stringify(payroll, null, 2))
                        setSelectedEmployeeForReceipt({ payroll })
                        console.log('🔵 State set, modal should appear now')
                      }}
                      className="flex items-center gap-1.5 text-sm text-white"
                      style={{ backgroundColor: 'oklch(62% .08 270)' }}
                      title="View/Download Payslip"
                    >
                      <Receipt size={16} />
                      <span className="hidden sm:inline">Payslip</span>
                      <Download size={14} className="sm:hidden" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Receipt Modal */}
      {selectedEmployeeForReceipt && selectedEmployeeForReceipt.payroll && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEmployeeForReceipt(null)
            }
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex items-center justify-between z-10 shadow-sm">
              <h3 className="text-lg font-semibold">Employee Payslip</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  console.log('Closing modal')
                  setSelectedEmployeeForReceipt(null)
                }}
                className=""
              >
                <X size={18} />
              </Button>
            </div>
            <div className="p-6">
              {selectedEmployeeForReceipt.payroll ? (
                (() => {
                  console.log('Rendering PaymentReceipt with payroll:', selectedEmployeeForReceipt.payroll)
                  const employeeName = `${selectedEmployeeForReceipt.payroll.first_name || ''} ${selectedEmployeeForReceipt.payroll.last_name || ''}`.trim()
                  console.log('Employee name:', employeeName)
                  return (
                    <PaymentReceipt
                      payroll={selectedEmployeeForReceipt.payroll}
                      employeeName={employeeName || 'Employee'}
                      onDownload={() => {
                        // Optional: Close modal after download
                        // setSelectedEmployeeForReceipt(null)
                      }}
                    />
                  )
                })()
              ) : (
                <div className="text-center p-8">
                  <p className="text-red-600">Error: No payroll data available</p>
                  <Button onClick={() => setSelectedEmployeeForReceipt(null)} className="mt-4">
                    Close
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

