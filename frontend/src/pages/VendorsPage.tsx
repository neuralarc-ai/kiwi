import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Building2, 
  Zap, 
  FileText, 
  Loader2,
  Plus,
  Calculator,
  ChevronDown
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService } from '@/services/api'
import { useToast, ToastContainer } from '@/components/ui/toast'

interface AccountingEntry {
  id: number
  head: string
  subhead: string | null
  tdsPercentage: number
  gstPercentage: number
  frequency: string
  remarks: string | null
  amount: number
  entryId?: string | null
  month: number
  year: number
}
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface VendorCategory {
  id: string
  name: string
  icon: any
  color: string
  defaultHeads: string[]
}

const vendorCategories: VendorCategory[] = [
  {
    id: 'facilities',
    name: 'Rent & Facilities',
    icon: Building2,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    defaultHeads: ['Rent', 'Utilities', 'Office Expenses']
  },
  {
    id: 'utilities',
    name: 'Utilities',
    icon: Zap,
    color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    defaultHeads: ['Utilities']
  },
  {
    id: 'services',
    name: 'Professional Services',
    icon: FileText,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    defaultHeads: ['Professional Services', 'Contractor Payments']
  }
]

export default function VendorsPage() {
  const { token, user } = useAuth()
  const toast = useToast()
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [accountingData, setAccountingData] = useState<AccountingEntry[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [localAmounts, setLocalAmounts] = useState<Record<number, number>>({})
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false)
  const [newEntry, setNewEntry] = useState({
    head: '',
    subhead: '',
    gstPercentage: '0',
    frequency: 'Monthly',
    remarks: '',
    amount: '0'
  })
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i)

  // Fetch accounting data
  const fetchAccountingData = async () => {
    if (!token) return

    setIsLoading(true)
    try {
      // Sync salary first
      try {
        await apiService.syncSalaryFromPayroll(token, selectedMonth, selectedYear)
      } catch (syncError) {
        console.warn('Could not sync salary:', syncError)
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      const data = await apiService.getAccountingData(token, selectedMonth, selectedYear)

      if (data && Array.isArray(data)) {
        setAccountingData(data)
        const amounts: Record<number, number> = {}
        data.forEach((entry: AccountingEntry) => {
          amounts[entry.id] = typeof entry.amount === 'number' ? entry.amount : parseFloat(String(entry.amount)) || 0
        })
        setLocalAmounts(amounts)
      } else {
        setAccountingData([])
      }
    } catch (err) {
      console.error('Error fetching accounting data:', err)
      toast.error('Failed to fetch vendor data')
      setAccountingData([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchAccountingData()
    }
  }, [token, selectedMonth, selectedYear])

  const handleAmountChange = (entryId: number, value: string) => {
    const numValue = parseFloat(value) || 0
    setLocalAmounts((prev) => ({ ...prev, [entryId]: numValue }))
  }

  const handleAmountBlur = async (entryId: number, amount: number) => {
    if (!token) return

    const originalEntry = accountingData?.find((e) => e.id === entryId)
    if (originalEntry && originalEntry.amount === amount) {
      return
    }

    setSavingIds((prev) => new Set(prev).add(entryId))

    try {
      await apiService.updateAccountingAmount(token, entryId, amount, selectedMonth, selectedYear)
      toast.success('Amount updated successfully')
      await fetchAccountingData()
    } catch (err: any) {
      console.error('Update failed:', err)
      toast.error(err.message || 'Failed to update amount')
      if (originalEntry) {
        setLocalAmounts((prev) => ({ ...prev, [entryId]: originalEntry.amount }))
      }
    } finally {
      setSavingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(entryId)
        return newSet
      })
    }
  }

  const handleAddEntry = async () => {
    if (!token) return

    setIsCreatingEntry(true)
    try {
      // Validate required fields
      if (!newEntry.head || !selectedMonth || !selectedYear) {
        toast.error('Please fill in all required fields (Head, Month, Year)')
        setIsCreatingEntry(false)
        return
      }
      
      const entryData = {
        head: newEntry.head.trim(),
        subhead: newEntry.subhead?.trim() || undefined,
        tdsPercentage: 0,
        gstPercentage: parseFloat(newEntry.gstPercentage) || 0,
        frequency: newEntry.frequency || 'Monthly',
        remarks: newEntry.remarks?.trim() || '',
        amount: parseFloat(newEntry.amount) || 0,
        month: selectedMonth,
        year: selectedYear
      }
      
      console.log('📤 Creating vendor entry:', entryData)
      
      await apiService.createAccountingEntry(token, entryData)

      toast.success('Vendor entry added successfully')
      setIsAddEntryDialogOpen(false)
      setNewEntry({
        head: '',
        subhead: '',
        gstPercentage: '0',
        frequency: 'Monthly',
        remarks: '',
        amount: '0'
      })
      // Small delay to ensure backend has processed the entry
      await new Promise(resolve => setTimeout(resolve, 300))
      await fetchAccountingData()
    } catch (err: any) {
      console.error('❌ Error creating entry:', err)
      console.error('❌ Error details:', {
        message: err?.message,
        response: err?.response,
        stack: err?.stack
      })
      
      // Extract error message
      let errorMessage = 'Failed to add vendor entry'
      if (err?.message) {
        errorMessage = err.message
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      
      toast.error(errorMessage)
    } finally {
      setIsCreatingEntry(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Filter vendor-related entries - show all entries except Salary & Tax
  const vendorEntries = useMemo(() => {
    if (!accountingData) return []
    
    // Exclude salary and tax entries - show everything else as vendor entries
    const excludedHeads = [
      'Salary & Wages',
      'TDS Payable',
      'GST Payable'
    ]
    
    return accountingData.filter(entry => !excludedHeads.includes(entry.head))
  }, [accountingData])

  // Group entries by category
  const groupedVendors = useMemo(() => {
    const grouped: Record<string, AccountingEntry[]> = {}
    
    vendorCategories.forEach(category => {
      grouped[category.id] = vendorEntries.filter(entry => 
        category.defaultHeads.includes(entry.head)
      )
    })
    
    // Add uncategorized vendor entries
    const categorizedHeads = vendorCategories.flatMap(c => c.defaultHeads)
    const uncategorized = vendorEntries.filter(entry => 
      !categorizedHeads.includes(entry.head)
    )
    
    if (uncategorized.length > 0) {
      grouped['other'] = uncategorized
    }
    
    return grouped
  }, [vendorEntries])

  // Calculate total vendor expenses
  const totalVendorExpenses = useMemo(() => {
    return vendorEntries.reduce((sum, entry) => {
      const amount = localAmounts[entry.id] ?? entry.amount
      const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0
      return sum + numAmount
    }, 0)
  }, [vendorEntries, localAmounts])

  const renderVendorCategory = (category: VendorCategory, entries: AccountingEntry[]) => {
    if (entries.length === 0) return null

    const total = entries.reduce((sum, entry) => {
      const amount = localAmounts[entry.id] ?? entry.amount
      const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0
      return sum + numAmount
    }, 0)

    const Icon = category.icon

    return (
      <Card variant="glass" className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${category.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl">{category.name}</CardTitle>
                <CardDescription>
                  {entries.length} {entries.length === 1 ? 'vendor' : 'vendors'}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-semibold text-sm">Vendor/Service</th>
                  <th className="text-left p-3 font-semibold text-sm">Subhead</th>
                  <th className="text-center p-3 font-semibold text-sm w-24">GST/Tax %</th>
                  <th className="text-left p-3 pl-6 font-semibold text-sm">Remarks</th>
                  <th className="text-right p-3 font-semibold text-sm">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isSaving = savingIds.has(entry.id)
                  const localAmount = localAmounts[entry.id] ?? entry.amount
                  const displayAmount = typeof localAmount === 'number' ? localAmount : parseFloat(String(localAmount)) || 0

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border"
                    >
                      <td className="p-3 text-sm font-medium">{entry.head}</td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {entry.subhead || '-'}
                      </td>
                      <td className="p-3 text-sm text-center">
                        {entry.gstPercentage > 0 ? `${entry.gstPercentage}%` : '-'}
                      </td>
                      <td className="p-3 pl-6 text-sm text-muted-foreground break-words">
                        {entry.remarks || '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={displayAmount || ''}
                            onChange={(e) => handleAmountChange(entry.id, e.target.value)}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value) || 0
                              handleAmountBlur(entry.id, value)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            className="w-28 text-right text-sm px-2"
                            disabled={isSaving}
                          />
                          {isSaving && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold bg-muted/50">
                  <td colSpan={4} className="p-3 text-sm text-right">
                    Total:
                  </td>
                  <td className="p-3 text-sm text-right">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <div className="space-y-6 overflow-x-hidden max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 gradient-text">Vendor Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage vendor expenses and payments. Changes automatically sync to Account section.
        </p>
      </motion.div>

      {/* Filter Bar - Unity Style */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Left side - Dropdowns */}
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Month Dropdown */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(parseInt(e.target.value))
                  setLocalAmounts({})
                }}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            </div>

            {/* Year Dropdown */}
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(parseInt(e.target.value))
                  setLocalAmounts({})
                }}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {(user?.role === 'admin' || user?.role === 'hr_executive') && (
              <Dialog open={isAddEntryDialogOpen} onOpenChange={setIsAddEntryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Add New Vendor Entry</DialogTitle>
                    <DialogDescription className="text-base">
                      Add a new vendor expense for {monthNames[selectedMonth - 1]} {selectedYear}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendor-head">Vendor/Service Name *</Label>
                      <Input
                        id="vendor-head"
                        value={newEntry.head}
                        onChange={(e) => setNewEntry({ ...newEntry, head: e.target.value })}
                        placeholder="e.g., Office Rent, Electricity Bill, Internet Service"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendor-subhead">Subhead (Optional)</Label>
                      <Input
                        id="vendor-subhead"
                        value={newEntry.subhead}
                        onChange={(e) => setNewEntry({ ...newEntry, subhead: e.target.value })}
                        placeholder="e.g., Main Office, Branch Office"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendor-gst">GST/Tax Percentage (%)</Label>
                      <Input
                        id="vendor-gst"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={newEntry.gstPercentage}
                        onChange={(e) => setNewEntry({ ...newEntry, gstPercentage: e.target.value })}
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendor-frequency">Frequency</Label>
                      <div className="relative">
                        <select
                          id="vendor-frequency"
                          value={newEntry.frequency}
                          onChange={(e) => setNewEntry({ ...newEntry, frequency: e.target.value })}
                          className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                          <option value="Once">Once</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendor-remarks">Remarks</Label>
                      <Input
                        id="vendor-remarks"
                        value={newEntry.remarks}
                        onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                        placeholder="Additional notes about this vendor"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendor-amount">Amount (₹) *</Label>
                      <Input
                        id="vendor-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newEntry.amount}
                        onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddEntryDialogOpen(false)
                        setNewEntry({
                          head: '',
                          subhead: '',
                          gstPercentage: '0',
                          frequency: 'Monthly',
                          remarks: '',
                          amount: '0'
                        })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddEntry} disabled={isCreatingEntry || !newEntry.head}>
                      {isCreatingEntry ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Vendor'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </Card>

      {/* Vendor Categories */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : vendorEntries.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-lg mb-4">
              No vendor data available for {monthNames[selectedMonth - 1]} {selectedYear}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Initialize accounting entries in the Account section first, or add vendor entries above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {vendorCategories.map((category) => {
            const entries = groupedVendors[category.id] || []
            const categoryCard = renderVendorCategory(category, entries)
            return categoryCard ? <div key={category.id}>{categoryCard}</div> : null
          })}

          {/* Other Vendors */}
          {groupedVendors['other'] && groupedVendors['other'].length > 0 && (
            <Card variant="glass" className="mb-6">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400">
                    <Calculator className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Other Vendors</CardTitle>
                    <CardDescription>
                      {groupedVendors['other'].length} {groupedVendors['other'].length === 1 ? 'vendor' : 'vendors'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 font-semibold text-sm">Vendor/Service</th>
                        <th className="text-left p-3 font-semibold text-sm">Subhead</th>
                        <th className="text-center p-3 font-semibold text-sm w-24">GST/Tax %</th>
                        <th className="text-left p-3 pl-6 font-semibold text-sm">Remarks</th>
                        <th className="text-right p-3 font-semibold text-sm">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedVendors['other'].map((entry) => {
                        const isSaving = savingIds.has(entry.id)
                        const localAmount = localAmounts[entry.id] ?? entry.amount
                        const displayAmount = typeof localAmount === 'number' ? localAmount : parseFloat(String(localAmount)) || 0

                        return (
                          <tr
                            key={entry.id}
                            className="border-b border-border"
                          >
                            <td className="p-3 text-sm font-medium">{entry.head}</td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {entry.subhead || '-'}
                            </td>
                            <td className="p-3 text-sm text-center">
                              {entry.gstPercentage > 0 ? `${entry.gstPercentage}%` : '-'}
                            </td>
                            <td className="p-3 pl-6 text-sm text-muted-foreground break-words">
                              {entry.remarks || '-'}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={displayAmount || ''}
                                  onChange={(e) => handleAmountChange(entry.id, e.target.value)}
                                  onBlur={(e) => {
                                    const value = parseFloat(e.target.value) || 0
                                    handleAmountBlur(entry.id, value)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur()
                                    }
                                  }}
                                  className="w-28 text-right text-sm px-2"
                                  disabled={isSaving}
                                />
                                {isSaving && (
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border font-semibold bg-muted/50">
                        <td colSpan={4} className="p-3 text-sm text-right">
                          Total:
                        </td>
                        <td className="p-3 text-sm text-right">
                          {formatCurrency(
                            groupedVendors['other'].reduce((sum, entry) => {
                              const amount = localAmounts[entry.id] ?? entry.amount
                              const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0
                              return sum + numAmount
                            }, 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grand Total */}
          <Card variant="glass" className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Total Vendor Expenses</h3>
                  <p className="text-sm text-muted-foreground">
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{formatCurrency(totalVendorExpenses)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-synced to Account section
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </>
  )
}

