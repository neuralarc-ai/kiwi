import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calculator, Loader2, TrendingUp, Plus, ChevronDown, ChevronUp, Info, X } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { apiService } from "@/services/api"
import { useToast, ToastContainer } from "@/components/ui/toast"
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

interface AccountingEntry {
  id: number
  head: string
  subhead: string | null
  tdsPercentage: number
  gstPercentage: number
  frequency: string | null
  remarks: string | null
  amount: number
  entryId: number | null
  month: number
  year: number
}

export default function AccountPage() {
  const { token } = useAuth()
  const toast = useToast()
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [localAmounts, setLocalAmounts] = useState<Record<number, number>>({})
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set())
  const [accountingData, setAccountingData] = useState<AccountingEntry[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEstimateDialogOpen, setIsEstimateDialogOpen] = useState(false)
  const [estimateBaseMonth, setEstimateBaseMonth] = useState(currentDate.getMonth() + 1)
  const [estimateBaseYear, setEstimateBaseYear] = useState(currentDate.getFullYear())
  const [numberOfMonths, setNumberOfMonths] = useState(3)
  const [estimateData, setEstimateData] = useState<AccountingEntry[] | null>(null)
  const [isCalculatingEstimate, setIsCalculatingEstimate] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false)
  const [newEntry, setNewEntry] = useState({
    head: "",
    subhead: "",
    gstPercentage: "0",
    frequency: "Monthly",
    remarks: "",
    amount: "0"
  })
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "1. Salary": false,
    "2. Operations": false,
    "3. Vendors": false,
    "4. Travel": false,
    "5. Marketing": false,
    "6. Tax & Compliance": false,
  })
  const [showHelpCard, setShowHelpCard] = useState(false)

  // Fetch accounting data
  const fetchAccountingData = async () => {
    if (!token) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // First, sync salary from payroll to ensure it's up-to-date
      try {
        const syncResult = await apiService.syncSalaryFromPayroll(token, selectedMonth, selectedYear)
        console.log('✅ Salary synced from payroll:', syncResult)
      } catch (syncError: any) {
        console.warn('⚠️ Could not sync salary from payroll:', syncError)
        // Continue even if sync fails
      }
      
      // Small delay to ensure sync is processed
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Then fetch accounting data (this will get the updated salary amount)
      const data = await apiService.getAccountingData(token, selectedMonth, selectedYear)
      
      if (data && Array.isArray(data)) {
        setAccountingData(data)
        // Initialize local amounts - ensure all amounts are numbers
        const amounts: Record<number, number> = {}
        data.forEach((entry: AccountingEntry) => {
          // Convert to number to ensure proper calculation
          const numAmount = typeof entry.amount === 'number' ? entry.amount : parseFloat(String(entry.amount)) || 0
          amounts[entry.id] = numAmount
          
          // Log salary entry for debugging
          if (entry.head === 'Salary & Wages') {
            console.log(`💰 Salary & Wages entry: ₹${numAmount} (ID: ${entry.id})`)
          }
        })
        setLocalAmounts(amounts)
      } else {
        setError("Failed to fetch accounting data")
        setAccountingData([])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch accounting data"
      setError(errorMessage)
      setAccountingData([])
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data when month/year changes
  useEffect(() => {
    if (token) {
      fetchAccountingData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, token])

  const handleInitializeEntries = async () => {
    if (!token) return

    if (!confirm(`Initialize accounting entries for ${monthNames[selectedMonth - 1]} ${selectedYear}? This will create default accounting categories.`)) {
      return
    }

    setIsInitializing(true)
    try {
      await apiService.initializeAccountingEntries(token, selectedMonth, selectedYear)
      toast.success('Accounting entries initialized successfully!')
      await fetchAccountingData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize entries'
      toast.error(errorMessage)
    } finally {
      setIsInitializing(false)
    }
  }

  const handleAddEntry = async () => {
    if (!token) return

    if (!newEntry.head.trim()) {
      toast.warning('Please enter a head/category name')
      return
    }

    setIsCreatingEntry(true)
    try {
      await apiService.createAccountingEntry(token, {
        head: newEntry.head.trim(),
        subhead: newEntry.subhead.trim() || undefined,
        tdsPercentage: 0,
        gstPercentage: parseFloat(newEntry.gstPercentage) || 0,
        frequency: newEntry.frequency || undefined,
        remarks: newEntry.remarks.trim() || undefined,
        amount: parseFloat(newEntry.amount) || 0,
        month: selectedMonth,
        year: selectedYear,
      })
      toast.success('Entry added successfully!')
      setIsAddEntryDialogOpen(false)
      setNewEntry({
        head: "",
        subhead: "",
        gstPercentage: "0",
        frequency: "Monthly",
        remarks: "",
        amount: "0"
      })
      await fetchAccountingData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add entry'
      toast.error(errorMessage)
    } finally {
      setIsCreatingEntry(false)
    }
  }

  const handleAmountChange = (headId: number, value: string) => {
    const numValue = parseFloat(value) || 0
    setLocalAmounts((prev) => ({ ...prev, [headId]: numValue }))
  }

  const handleAmountBlur = async (headId: number, amount: number) => {
    if (!token) return

    // Don't save if value hasn't changed
    const originalEntry = accountingData?.find((e) => e.id === headId)
    if (originalEntry && originalEntry.amount === amount) {
      return
    }

    setSavingIds((prev) => new Set(prev).add(headId))

    try {
      await apiService.updateAccountingAmount(token, headId, amount, selectedMonth, selectedYear)
      toast.success("Amount updated successfully")
      // Refresh data to get updated values
      await fetchAccountingData()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update amount"
      console.error("[Accounting] Update failed:", errorMessage)
      toast.error(errorMessage)
      // Revert to original value on error
      if (originalEntry) {
        setLocalAmounts((prev) => ({ ...prev, [headId]: originalEntry.amount }))
      }
    } finally {
      setSavingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(headId)
        return newSet
      })
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i)

  const handleCalculateEstimate = async () => {
    if (!token) return
    
    setIsCalculatingEstimate(true)
    
    try {
      const data = await apiService.getAccountingData(token, estimateBaseMonth, estimateBaseYear)

      if (data && Array.isArray(data)) {
        setEstimateData(data)
      } else {
        toast.error("Failed to fetch base month data")
        setEstimateData(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to calculate estimate"
      alert(errorMessage)
      setEstimateData(null)
    } finally {
      setIsCalculatingEstimate(false)
    }
  }

  // Calculate grand total from estimate data
  const estimateGrandTotal = estimateData 
    ? estimateData.reduce((sum, entry) => sum + entry.amount, 0)
    : 0

  // Calculate total for number of months
  const totalForMonths = estimateGrandTotal * numberOfMonths

  // Prepare chart data for visualization
  const chartData = React.useMemo(() => {
    if (!estimateData || estimateData.length === 0) return []

    const data = []
    
    // Add base month
    data.push({
      month: monthNames[estimateBaseMonth - 1],
      year: estimateBaseYear,
      amount: estimateGrandTotal,
      label: `${monthNames[estimateBaseMonth - 1]} ${estimateBaseYear} (Base)`,
    })

    // Add future months
    for (let i = 1; i <= numberOfMonths; i++) {
      let month = estimateBaseMonth + i
      let year = estimateBaseYear
      while (month > 12) {
        month -= 12
        year += 1
      }
      data.push({
        month: monthNames[month - 1],
        year,
        amount: estimateGrandTotal,
        label: `${monthNames[month - 1]} ${year}`,
      })
    }

    return data
  }, [estimateData, estimateBaseMonth, estimateBaseYear, numberOfMonths, estimateGrandTotal, monthNames])

  const chartConfig = {
    amount: {
      label: "Amount",
      color: "hsl(var(--primary))",
    },
  }

  // Define main category groups - matching Vendors section structure
  const categoryGroups: Record<string, { label: string; heads: string[] }> = {
    "all": {
      label: "All Categories",
      heads: []
    },
    "salary": {
      label: "Salary & Wages",
      heads: ["Salary & Wages"]
    },
    "vendors": {
      label: "Vendors",
      heads: [] // Will be filtered separately to exclude Salary & Tax
    },
    "tax": {
      label: "Tax & Compliance",
      heads: ["GST Payable"]
    }
  }

  // Filter data by selected category group
  const filteredData = accountingData?.filter((entry) => {
    if (selectedCategory === "all") return true
    if (selectedCategory === "salary") {
      return entry.head === "Salary & Wages"
    }
    if (selectedCategory === "vendors") {
      // Show all entries except Salary & Tax (matching Vendors section)
      return entry.head !== "Salary & Wages" && entry.head !== "GST Payable"
    }
    if (selectedCategory === "tax") {
      return entry.head === "GST Payable"
    }
    return false
  }) || []

  // Group entries into categories
  const salaryEntries = filteredData.filter(
    (entry) => entry.head === "Salary & Wages"
  )

  const rentAndFacilities = filteredData.filter(
    (entry) => ["Rent", "Utilities", "Office Expenses"].includes(entry.head)
  )

  const professionalServices = filteredData.filter(
    (entry) => ["Professional Services", "Contractor Payments"].includes(entry.head)
  )

  const financeAndInterest = filteredData.filter(
    (entry) => entry.head === "Interest Paid"
  )

  const travelAndMarketing = filteredData.filter(
    (entry) => ["Travel & Conveyance", "Marketing & Advertising"].includes(entry.head)
  )

  const insuranceAndMisc = filteredData.filter(
    (entry) => ["Insurance", "Miscellaneous Expenses"].includes(entry.head)
  )

  const taxLiabilities = filteredData.filter(
    (entry) => entry.head === "GST Payable"
  )

  // Calculate vendor entries (all entries except Salary & Tax)
  const vendorEntries = filteredData.filter(
    (entry) => entry.head !== "Salary & Wages" && 
               entry.head !== "GST Payable"
  )

  // Helper function to render a table
  const renderTable = (
    title: string,
    entries: AccountingEntry[],
    color: string,
    defaultHead?: string
  ) => {
    if (entries.length === 0) return null

    const total = entries.reduce((sum, entry) => {
      const amount = localAmounts[entry.id] ?? entry.amount
      // Ensure amount is a number for proper addition
      const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0
      return sum + numAmount
    }, 0)

    // Check if this is Salary & Wages table
    const isSalaryTable = title.includes("Salary") || entries.some(e => e.head === "Salary & Wages")

    return (
      <Card variant="glass" className="mb-6 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${color}`}>
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {entries.length} {entries.length === 1 ? "entry" : "entries"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isAddEntryDialogOpen} onOpenChange={(open) => {
                setIsAddEntryDialogOpen(open)
                if (!open) {
                  setNewEntry({
                    head: "",
                    subhead: "",
                    gstPercentage: "0",
                    frequency: "Monthly",
                    remarks: "",
                    amount: "0"
                  })
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => {
                      if (defaultHead) {
                        setNewEntry({
                          ...newEntry,
                          head: defaultHead
                        })
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">Add New Accounting Entry</DialogTitle>
                    <DialogDescription className="text-base">
                      Add a new accounting entry for {monthNames[selectedMonth - 1]} {selectedYear}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="head">Head/Category *</Label>
                      <Input
                        id="head"
                        value={defaultHead || newEntry.head}
                        onChange={(e) => setNewEntry({ ...newEntry, head: e.target.value })}
                        placeholder="e.g., Salary & Wages, Rent, Utilities"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subhead">Subhead (Optional)</Label>
                      <Input
                        id="subhead"
                        value={newEntry.subhead}
                        onChange={(e) => setNewEntry({ ...newEntry, subhead: e.target.value })}
                        placeholder="e.g., Office Rent, Employee Salaries"
                        className="placeholder:opacity-40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gstPercentage">GST/Tax Percentage (%)</Label>
                      <Input
                        id="gstPercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={newEntry.gstPercentage}
                        onChange={(e) => setNewEntry({ ...newEntry, gstPercentage: e.target.value })}
                        placeholder="0"
                        className="placeholder:opacity-40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="frequency">Frequency</Label>
                      <div className="relative">
                        <select
                          id="frequency"
                        value={newEntry.frequency}
                          onChange={(e) => setNewEntry({ ...newEntry, frequency: e.target.value })}
                          className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                          <option value="One-time">One-time</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={newEntry.amount}
                        onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                        placeholder="0"
                        className="placeholder:opacity-40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remarks">Remarks (Optional)</Label>
                      <Input
                        id="remarks"
                        value={newEntry.remarks}
                        onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                        placeholder="Additional notes or description"
                        className="placeholder:opacity-40"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddEntryDialogOpen(false)
                        setNewEntry({
                          head: "",
                          subhead: "",
                          gstPercentage: "0",
                          frequency: "Monthly",
                          remarks: "",
                          amount: "0"
                        })
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddEntry}
                      disabled={isCreatingEntry || !(defaultHead || newEntry.head.trim())}
                    >
                      {isCreatingEntry ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Entry
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => {
                  setExpandedSections(prev => ({
                    ...prev,
                    [title]: !prev[title]
                  }))
                }}
              >
                {expandedSections[title] ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {expandedSections[title] && (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Head</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subhead</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">{isSalaryTable ? "TDS %" : "GST/Tax %"}</th>
                  <th className="text-left py-3 px-4 pl-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Frequency</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remarks</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entries.map((entry) => {
                  const isSaving = savingIds.has(entry.id)
                  const localAmount = localAmounts[entry.id] ?? entry.amount
                  // Ensure amount is a number for display
                  const displayAmount = typeof localAmount === 'number' ? localAmount : parseFloat(String(localAmount)) || 0

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-200 dark:border-gray-700"
                    >
                      <td className="py-4 px-4 text-sm font-medium">{entry.head}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {entry.subhead || "-"}
                      </td>
                      <td className="py-4 px-4 text-sm text-center">
                        {isSalaryTable 
                          ? (entry.tdsPercentage > 0 ? `${entry.tdsPercentage}%` : "-")
                          : (entry.gstPercentage > 0 ? `${entry.gstPercentage}%` : "-")
                        }
                      </td>
                      <td className="py-4 px-4 pl-6 text-sm">{entry.frequency || "-"}</td>
                      <td className="py-4 px-4 text-sm text-muted-foreground break-words">
                        {entry.remarks || "-"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {entry.head === "Salary & Wages" ? (
                            <>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={displayAmount || ""}
                                disabled={true}
                                className="w-28 text-right text-sm px-2 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                title="Auto-synced from payroll (read-only)"
                              />
                              <span className="text-xs text-muted-foreground" title="Auto-synced from payroll">
                                🔄
                              </span>
                            </>
                          ) : (
                            <>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={displayAmount || ""}
                                onChange={(e) => handleAmountChange(entry.id, e.target.value)}
                                onBlur={(e) => {
                                  const value = parseFloat(e.target.value) || 0
                                  handleAmountBlur(entry.id, value)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur()
                                  }
                                }}
                                className="w-28 text-right text-sm px-2"
                                disabled={isSaving}
                              />
                              {isSaving && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-gray-700 font-semibold bg-muted/50">
                  <td colSpan={5} className="py-3 px-4 text-sm text-right">
                    Total:
                  </td>
                  <td className="py-3 px-4 text-sm text-right">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          </CardContent>
        )}
      </Card>
    )
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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 gradient-text">Accounts Master</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage monthly accounting entries. Edit amounts only - all other details are pre-filled.
          </p>
        </div>
        <Dialog open={isEstimateDialogOpen} onOpenChange={setIsEstimateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <TrendingUp className="h-4 w-4" />
              Estimate Future Months
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Future Months Revenue Estimation</DialogTitle>
              <DialogDescription className="text-base">
                Calculate the total revenue required for upcoming months based on a base month's total.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="estimate-base-month">Base Month (Source)</Label>
                <div className="relative">
                  <select
                    id="estimate-base-month"
                    value={estimateBaseMonth}
                    onChange={(e) => {
                      setEstimateBaseMonth(parseInt(e.target.value))
                    setEstimateData(null)
                  }}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                >
                    {monthNames.map((month, index) => (
                      <option key={index} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimate-base-year">Base Year</Label>
                <div className="relative">
                  <select
                    id="estimate-base-year"
                    value={estimateBaseYear}
                    onChange={(e) => {
                      setEstimateBaseYear(parseInt(e.target.value))
                    setEstimateData(null)
                  }}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
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

              <div className="space-y-2">
                <Label htmlFor="number-of-months">Number of Future Months</Label>
                <div className="relative">
                  <select
                    id="number-of-months"
                    value={numberOfMonths}
                    onChange={(e) => setNumberOfMonths(parseInt(e.target.value))}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'month' : 'months'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                </div>
              </div>

              <Button
                onClick={handleCalculateEstimate}
                disabled={isCalculatingEstimate}
                className="w-full gap-2"
              >
                {isCalculatingEstimate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    Calculate Estimate
                  </>
                )}
              </Button>

              {estimateData !== null && (
                <div className="space-y-6 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card variant="glass">
                      <CardContent className="p-5 space-y-2">
                        <div className="text-sm text-muted-foreground mb-2">Base Month Total</div>
                        <div className="text-lg font-semibold text-muted-foreground">{monthNames[estimateBaseMonth - 1]} {estimateBaseYear}</div>
                        <div className="text-3xl font-bold">{formatCurrency(estimateGrandTotal)}</div>
                      </CardContent>
                    </Card>

                    <Card variant="glass" className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20">
                      <CardContent className="p-5 space-y-2">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Estimated Total for {numberOfMonths} Month{numberOfMonths > 1 ? 's' : ''}</div>
                        <div className="text-3xl font-bold text-primary">{formatCurrency(totalForMonths)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {chartData.length > 0 && (
                    <Card variant="glass">
                      <CardHeader>
                        <CardTitle>Monthly Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfig} className="h-[400px] w-full">
                          <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="label"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              angle={-45}
                              textAnchor="end"
                              height={100}
                              className="text-sm"
                              interval={0}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              className="text-sm"
                              width={80}
                              tickFormatter={(value) => {
                                if (value >= 1000000) {
                                  return `₹${(value / 1000000).toFixed(1)}M`
                                } else if (value >= 1000) {
                                  return `₹${(value / 1000).toFixed(0)}K`
                                }
                                return `₹${value}`
                              }}
                            />
                            <ChartTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                                      <div className="grid gap-2">
                                        <div className="flex items-center justify-between gap-4">
                                          <span className="text-sm font-medium">{payload[0].payload.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-muted-foreground">
                                            Amount:
                                          </span>
                                          <span className="text-sm font-bold">
                                            {formatCurrency(payload[0].value as number)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                }
                                return null
                              }}
                            />
                            <Bar
                              dataKey="amount"
                              fill="hsl(var(--primary))"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}

                  <Card variant="glass" className="border-blue-500/20 bg-blue-500/10">
                    <CardContent className="p-4">
                      <p className="text-blue-700 dark:text-blue-400 text-sm leading-relaxed">
                        <strong>Estimation Summary:</strong> Based on {monthNames[estimateBaseMonth - 1]} {estimateBaseYear}'s total of {formatCurrency(estimateGrandTotal)}, 
                        you will need approximately <strong className="text-base">{formatCurrency(totalForMonths)}</strong> for the next {numberOfMonths} month{numberOfMonths > 1 ? 's' : ''}.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEstimateDialogOpen(false)
                  setEstimateData(null)
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                  setSelectedCategory("all")
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
                  setSelectedCategory("all")
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

            {/* Category Filter Dropdown */}
            {accountingData && accountingData.length > 0 && (
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {Object.entries(categoryGroups).map(([key, group]) => (
                    <option key={key} value={key}>
                      {group.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Accounting Tables */}
      {isLoading ? (
        <Card variant="glass">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 w-full rounded-lg bg-gray-200/50 dark:bg-gray-800/50 animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card variant="glass">
          <CardContent className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchAccountingData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : !accountingData || accountingData.length === 0 ? (
        <Card variant="glass">
          <CardContent className="text-center py-12">
            <div className="space-y-4">
              <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-base">
                No accounting data available for {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
              <p className="text-sm text-muted-foreground">
                Click the button below to initialize default accounting categories (Salary, Rent, Utilities, Professional Services, etc.)
              </p>
              <Button 
                onClick={handleInitializeEntries}
                disabled={isInitializing}
                className="gap-2"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    Initialize Accounting Entries
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {renderTable(
            "1. Salary",
            salaryEntries,
            "bg-green-500/10 text-green-600 dark:text-[#27584F]",
            "Salary & Wages"
          )}

          {renderTable(
            "2. Operations",
            [...rentAndFacilities, ...professionalServices, ...financeAndInterest, ...travelAndMarketing, ...insuranceAndMisc],
            "bg-green-500/10 text-green-600 dark:text-green-400"
          )}

          {renderTable(
            "3. Vendors",
            vendorEntries,
            "bg-pink-500/10 text-pink-600 dark:text-pink-400"
          )}

          {renderTable(
            "4. Travel",
            travelAndMarketing,
            "bg-green-500/10 text-green-600 dark:text-green-400"
          )}

          {renderTable(
            "5. Marketing",
            travelAndMarketing.filter(e => e.head === "Marketing & Advertising"),
            "bg-green-500/10 text-green-600 dark:text-green-400"
          )}

          {renderTable(
            "6. Tax & Compliance",
            taxLiabilities,
            "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          )}

          {/* Grand Total Summary */}
          <Card variant="glass" className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Grand Total</h3>
                  <p className="text-sm text-muted-foreground">
                    {monthNames[selectedMonth - 1]} {selectedYear}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {formatCurrency(
                      (filteredData || []).reduce((sum, entry) => {
                        const amount = localAmounts[entry.id] ?? entry.amount
                        // Ensure amount is a number for proper addition
                        const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount)) || 0
                        return sum + numAmount
                      }, 0)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All categories combined
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Info Card */}
      {showHelpCard && (
        <Card variant="glass" className="bg-blue-500/10 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Info size={20} className="text-blue-600 dark:text-blue-400" />
                How to Use
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowHelpCard(false)}
                aria-label="Close help card"
              >
                <X size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>All accounting heads are pre-filled with GST/tax rules</li>
              <li>Only the <strong>Amount</strong> field is editable</li>
              <li>Changes are automatically saved when you click outside the input field</li>
              <li>Select a different month/year to view or edit entries for that period</li>
              <li>GST/tax calculations follow applicable tax regulations</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Show Help Button (when card is hidden) */}
      {!showHelpCard && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowHelpCard(true)}
            className="gap-2"
          >
            <Info size={16} />
            Show Help
          </Button>
        </div>
      )}
    </div>
    </>
  )
}

