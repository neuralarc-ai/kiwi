import { motion } from 'framer-motion'
import { Search, X, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService, type Payroll } from '@/services/api'
import PaymentReceipt from '@/components/PaymentReceipt'
import { useToast, ToastContainer } from '@/components/ui/toast'

export default function PayrollPage() {
  const { user, token } = useAuth()
  const toast = useToast()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear] = useState<number>(new Date().getFullYear())
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
      
      // Always use createPayroll when payroll_id is missing
      // createPayroll handles both creating new records and updating existing ones
      if (!payroll.payroll_id && !payroll.id) {
        // No payroll record exists, create one
        await apiService.createPayroll({
          employee_id: payroll.employee_id,
          month: selectedMonth,
          year: selectedYear,
          basic_salary: payroll.salary || payroll.basic_salary || 0,
          allowances: payroll.allowances || 0,
          deductions: payroll.deductions || 0,
          status: newStatus
        }, token)
      } else {
        // Payroll record exists, update it
        const payrollId = payroll.payroll_id || payroll.id
        if (!payrollId) {
          throw new Error('Payroll ID is missing')
        }
        await apiService.updatePayroll(payrollId, { status: newStatus }, token)
      }
      
      // Refresh the payroll list
      await fetchPayrolls()
      setError('')
      
      // Show success toast
      const employeeName = `${payroll.first_name} ${payroll.last_name}`
      toast.success(`Payment status updated to ${newStatus} for ${employeeName}`)
    } catch (err: any) {
      console.error('Error updating payment status:', err)
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to update payment status'
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Show error for a few seconds then clear
      setTimeout(() => {
        setError('')
      }, 5000)
    }
  }

  const getMonthYearLabel = () => {
    return `${getMonthName(selectedMonth)} ${selectedYear}`
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    <div className="space-y-6 overflow-x-hidden max-w-full">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl md:text-2xl font-bold mb-1">Payment List</h1>
        <p className="text-sm text-muted-foreground">
          {filteredPayrolls.length} {filteredPayrolls.length === 1 ? 'payment' : 'payments'} for {getMonthYearLabel()}
        </p>
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

      {/* Filter Bar - Unity Style */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Left side - Dropdowns */}
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Period Dropdown */}
            <div className="relative">
              <select
                value={getMonthYearLabel()}
                onChange={() => {
                  // This will be handled by month/year dropdowns
                }}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                disabled
              >
                <option>{getMonthYearLabel()}</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            </div>

            {/* Month Dropdown */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            </div>
          </div>

          {/* Right side - Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Small Search Bar */}
            <div className="relative flex-1 sm:flex-initial sm:w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={14} />
              <Input
                variant="glass"
                placeholder="Search"
                className="pl-8 pr-3 py-1.5 h-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPayrolls.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPayrolls.map((payroll) => (
                    <motion.tr
                  key={payroll.employee_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className=""
                    >
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-sm">
                            {payroll.first_name} {payroll.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {payroll.emp_id || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm">Bank Transfer</span>
                      </td>
                      <td className="py-4 px-4">
                    {isAdmin ? (
                      <select
                        value={isPaid(payroll) ? 'paid' : 'unpaid'}
                        onChange={(e) => {
                          const newValue = e.target.value
                          const isCurrentlyPaid = isPaid(payroll)
                          const newStatus = newValue === 'paid' ? 'paid' : 'processed'
                          
                          if ((newValue === 'paid' && !isCurrentlyPaid) || (newValue === 'unpaid' && isCurrentlyPaid)) {
                            const employeeName = `${payroll.first_name} ${payroll.last_name}`
                                toast.success(`Marking salary as ${newValue} for ${employeeName}`)
                              handleStatusChange(payroll, newStatus)
                          }
                        }}
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/20 ${
                          isPaid(payroll)
                                ? 'bg-green-500/20 text-green-600 dark:bg-[#27584F]/20 dark:text-[#27584F] dark:border-[#27584F]/30 border border-green-500/30'
                                : 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
                        }`}
                      >
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    ) : (
                          <Badge className={isPaid(payroll) 
                            ? "bg-green-500/20 text-green-600 dark:bg-[#27584F]/20 dark:text-[#27584F] dark:border-[#27584F]/30 border-green-500/30 text-xs" 
                            : "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs"
                          }>
                            {isPaid(payroll) ? 'Paid' : 'Unpaid'}
                      </Badge>
                    )}
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-sm">
                            ₹{Number(payroll.net_salary || 0).toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-orange-600 mt-0.5" style={{ color: 'hsl(var(--palette-red-orange))' }}>
                            ₹{Number(payroll.deductions || 0).toLocaleString('en-IN')} deductions
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setSelectedEmployeeForReceipt({ payroll })
                            }}
                            title="Payslip"
                          >
                            <span className="text-xs">Payslip</span>
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
              ))}
                </tbody>
              </table>
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
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex items-center justify-between z-50 shadow-sm">
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
    </>
  )
}

