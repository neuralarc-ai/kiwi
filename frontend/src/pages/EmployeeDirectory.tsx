import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, UserPlus, Edit, Trash2, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiService, Employee } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import AddEmployeeModal from '@/components/AddEmployeeModal'
import { useToast, ToastContainer } from '@/components/ui/toast'

export default function EmployeeDirectory() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)

  useEffect(() => {
    fetchEmployees()
  }, [token])

  const fetchEmployees = async () => {
    if (!token) return

    try {
      setLoading(true)
      const data = await apiService.getEmployees(token)
      setEmployees(data)
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!token) return

    const employee = employees.find(emp => emp.id === id)
    const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Employee'

    try {
      await apiService.deleteEmployee(id, token)
      toast.success(`${employeeName} deleted successfully`)
      fetchEmployees()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete employee')
    }
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingEmployee(null)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingEmployee(null)
  }

  const handleModalSuccess = () => {
    fetchEmployees()
  }

  // Filter employees
  const filteredEmployees = useMemo(() => {
    let filtered = employees

    // Filter by department
    if (selectedDepartment !== 'All') {
      filtered = filtered.filter(emp => emp.department === selectedDepartment)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(emp =>
        emp.first_name?.toLowerCase().includes(query) ||
        emp.last_name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.employee_id?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [employees, selectedDepartment, searchQuery])

  // Get unique departments
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>()
    employees.forEach(emp => {
      if (emp.department) {
        deptSet.add(emp.department)
      }
    })
    return ['All', ...Array.from(deptSet).sort()]
  }, [employees])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-600 dark:bg-[#27584F]/20 dark:text-[#27584F] dark:border-[#27584F]/30 border-green-500/30 text-xs">Active</Badge>
      case 'on_leave':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs">On Leave</Badge>
      case 'inactive':
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30 text-xs">Inactive</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500/30 text-xs">Active</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    <div className="space-y-6 overflow-x-hidden max-w-full">
        {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-1">Employee List</h1>
            <p className="text-sm text-muted-foreground">
              {filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'}
          </p>
        </div>
          <Button onClick={handleAddNew} size="sm" className="w-full sm:w-auto">
            <UserPlus className="mr-2" size={16} />
          Add Employee
        </Button>
      </motion.div>

        {/* Filter Bar - Unity Style */}
        <Card variant="glass" className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Left side - Dropdowns */}
            <div className="flex flex-wrap gap-3 flex-1">
              {/* Department Dropdown */}
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
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
      ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">
              {searchQuery || selectedDepartment !== 'All'
                ? 'No employees found matching your filters'
                : 'No employees found. Add your first employee to get started.'}
            </p>
              </div>
      ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Department
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Date Joined
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredEmployees.map((employee) => (
                      <motion.tr
                  key={employee.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className=""
                      >
                        <td className="py-4 px-4">
                          <div 
                            className="cursor-pointer hover:text-primary transition-colors"
                              onClick={() => navigate(`/dashboard/employee/${employee.id}`)}
                            >
                            <div className="font-medium text-sm">
                              {employee.first_name} {employee.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {employee.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm">{employee.department || 'N/A'}</span>
                        </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(employee.status || 'active')}
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm">{formatDate(employee.hire_date ?? null)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(employee)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 size={14} />
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

      {/* Add/Edit Employee Modal */}
      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        employee={editingEmployee || undefined}
      />
    </div>
    </>
  )
}
