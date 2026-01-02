import { TrendingUp, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiService, type Employee } from '@/services/api'
import { useToast, ToastContainer } from '@/components/ui/toast'

interface PerformanceData {
  id?: number
  employee_id: number
  month: number
  year: number
  performance_percentage: number
  first_name?: string
  last_name?: string
  emp_id?: string
  department?: string
}

export default function PerformancePage() {
  const { user, token } = useAuth()
  const toast = useToast()
  const [performances, setPerformances] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [showForm, setShowForm] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [formData, setFormData] = useState({
    employee_id: 0,
    performance_percentage: 0,
  })
  
  const isAdmin = user?.role === 'admin' || user?.role === 'hr_executive'

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      
      // Fetch employees
      const empData = await apiService.getEmployees(token)
      setEmployees(Array.isArray(empData) ? empData : [])
      
      // Fetch performance data
      const perfData = await apiService.getMonthlyPerformance(token, selectedMonth, selectedYear)
      setPerformances(Array.isArray(perfData) ? perfData : [])
    } catch (err: any) {
      console.error('Error loading data:', err)
      setError(err?.message || 'Failed to load data')
      setPerformances([])
    } finally {
      setLoading(false)
    }
  }, [token, selectedMonth, selectedYear])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast.warning('Please log in to add performance')
      return
    }

    if (formData.employee_id === 0) {
      toast.warning('Please select an employee')
      return
    }

    if (formData.performance_percentage < 0 || formData.performance_percentage > 100) {
      toast.warning('Performance percentage must be between 0 and 100')
      return
    }

    try {
      const data = {
        employee_id: parseInt(String(formData.employee_id)),
        month: parseInt(String(selectedMonth)),
        year: parseInt(String(selectedYear)),
        performance_percentage: parseFloat(String(formData.performance_percentage)),
      }

      await apiService.createOrUpdatePerformance(data, token)
      await loadData()
      setShowForm(false)
      setFormData({ employee_id: 0, performance_percentage: 0 })
      toast.success('Performance saved successfully!')
    } catch (err: any) {
      console.error('Error saving performance:', err)
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to save performance'
      toast.error(errorMessage)
    }
  }

  const handleDelete = async (id: number) => {
    if (!token) return
    if (!confirm('Are you sure you want to delete this performance record?')) return

    try {
      await apiService.deletePerformance(id, token)
      await loadData()
      toast.success('Performance deleted successfully!')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete performance')
    }
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-400'
    if (percentage >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 overflow-x-hidden max-w-full">
        <div className="flex-1 min-w-0 overflow-x-hidden">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-black dark:text-white truncate">
            Employee Performance
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 truncate">Manage employee performance records</p>
        </div>
        {isAdmin && token && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap w-full sm:w-auto"
          >
            <Plus size={18} />
            {showForm ? 'Cancel' : 'Add Performance'}
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {showForm && isAdmin && token && (
        <Card className="glass-strong">
          <CardHeader>
            <CardTitle>Add Employee Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Employee *</label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: parseInt(e.target.value) })}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground"
                  >
                    <option value={0}>Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground"
                  >
                    {monthNames.map((month, index) => (
                      <option key={index + 1} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                    min="2020"
                    max="2100"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-sm font-medium mb-2 block">Performance Percentage (%) *</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.performance_percentage || ''}
                    onChange={(e) => setFormData({ ...formData, performance_percentage: parseFloat(e.target.value) || 0 })}
                    required
                    placeholder="Enter percentage (0-100)"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save Performance</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setFormData({ employee_id: 0, performance_percentage: 0 })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="glass-strong">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full md:w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground"
                disabled={!token}
              >
                {monthNames.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
                className="w-full md:w-32"
                min="2020"
                max="2100"
                disabled={!token}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-strong">
        <CardHeader>
          <CardTitle>Performance Records - {monthNames[selectedMonth - 1]} {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          ) : !token ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground text-lg">Please log in to view performance records.</p>
            </div>
          ) : performances.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="mx-auto text-muted-foreground mb-4" size={48} />
              <p className="text-muted-foreground">
                No performance records for {monthNames[selectedMonth - 1]} {selectedYear}
              </p>
              {isAdmin && (
                <p className="text-sm text-muted-foreground mt-2">Click "Add Performance" to add records.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto w-full max-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table className="w-full min-w-[600px] sm:min-w-[640px] text-sm" style={{ maxWidth: 'none' }}>
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Employee</th>
                    <th className="text-left p-3 font-medium">ID</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-left p-3 font-medium">Performance</th>
                    {isAdmin && <th className="text-left p-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {performances.map((performance) => (
                    <tr 
                      key={`${performance.employee_id}-${performance.month}-${performance.year}`} 
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="p-3 font-medium">
                        {performance.first_name || ''} {performance.last_name || ''}
                      </td>
                      <td className="p-3 text-muted-foreground">{performance.emp_id || '-'}</td>
                      <td className="p-3 text-muted-foreground">{performance.department || '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {(() => {
                            const percentage = typeof performance.performance_percentage === 'number' 
                              ? performance.performance_percentage 
                              : parseFloat(String(performance.performance_percentage || 0)) || 0
                            return (
                              <>
                                <Badge variant={percentage >= 80 ? 'success' : percentage >= 60 ? 'secondary' : 'destructive'}>
                                  <span className={getPerformanceColor(percentage)}>
                                    {percentage.toFixed(1)}%
                                  </span>
                                </Badge>
                                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      percentage >= 80
                                        ? 'bg-green-500'
                                        : percentage >= 60
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                  />
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </td>
                      {isAdmin && performance.id && (
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(performance.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  )
}
