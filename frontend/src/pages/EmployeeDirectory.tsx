import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, UserPlus, MoreVertical, Edit, Trash2, Mail, Phone, MapPin, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { apiService, Employee } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import AddEmployeeModal from '@/components/AddEmployeeModal'

// Departments will be dynamically generated from actual employees

export default function EmployeeDirectory() {
  const { token } = useAuth()
  const navigate = useNavigate()
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
    if (!token || !confirm('Are you sure you want to delete this employee?')) return

    try {
      await apiService.deleteEmployee(id, token)
      fetchEmployees()
    } catch (error: any) {
      alert(error?.message || 'Failed to delete employee')
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
        emp.employee_id?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [employees, selectedDepartment, searchQuery])

  // Get unique departments from actual employees
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>()
    employees.forEach(emp => {
      if (emp.department) {
        deptSet.add(emp.department)
      }
    })
    return ['All', ...Array.from(deptSet).sort()]
  }, [employees])

  // Group employees by department
  const groupedEmployees = useMemo(() => {
    const grouped: { [key: string]: Employee[] } = {}
    
    filteredEmployees.forEach(emp => {
      const dept = emp.department || 'Unassigned'
      if (!grouped[dept]) {
        grouped[dept] = []
      }
      grouped[dept].push(emp)
    })

    return grouped
  }, [filteredEmployees])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'on_leave':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'inactive':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 overflow-x-hidden max-w-full"
      >
        <div className="flex-1 min-w-0 overflow-x-hidden">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 gradient-text truncate">Employee Directory</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground truncate">
            Manage and view all employees ({filteredEmployees.length} {filteredEmployees.length === 1 ? 'employee' : 'employees'})
          </p>
        </div>
        <Button onClick={handleAddNew} className="w-full sm:w-auto flex-shrink-0 whitespace-nowrap">
          <UserPlus className="mr-2" size={18} />
          Add Employee
        </Button>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3 sm:gap-4 overflow-x-hidden max-w-full"
      >
        <div className="flex-1 relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            variant="glass"
            placeholder="Search by name, email, employee ID, department..."
            className="pl-9 w-full text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Department Filter Tags - Only show departments that have employees */}
      {availableDepartments.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-2 flex-wrap"
        >
          {availableDepartments.map((dept) => (
            <Badge
              key={dept}
              variant={selectedDepartment === dept ? 'default' : 'secondary'}
              className="cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedDepartment(dept)}
            >
              {dept} {dept !== 'All' && `(${employees.filter(e => e.department === dept).length})`}
            </Badge>
          ))}
        </motion.div>
      )}

      {/* Employee List - Grouped by Department */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} variant="glass">
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              {searchQuery || selectedDepartment !== 'All'
                ? 'No employees found matching your filters'
                : 'No employees found. Add your first employee to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedEmployees).map(([department, deptEmployees]) => (
          <motion.div
            key={department}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground">
              {department} ({deptEmployees.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {deptEmployees.map((employee, index) => (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="glass" className="hover:bg-white/5 transition-colors">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                          {employee.profile_photo ? (
                            <img
                              src={employee.profile_photo}
                              alt={`${employee.first_name} ${employee.last_name}`}
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-blue-500/30 shadow-lg flex-shrink-0"
                              onError={(e) => {
                                // Fallback to initials if image fails to load
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const fallback = target.nextElementSibling as HTMLElement
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-base sm:text-xl flex-shrink-0 ${
                              employee.profile_photo ? 'hidden' : ''
                            }`}
                          >
                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 
                              className="font-semibold text-base sm:text-lg cursor-pointer hover:text-blue-400 transition-colors truncate"
                              onClick={() => navigate(`/dashboard/employee/${employee.id}`)}
                            >
                              {employee.first_name} {employee.last_name}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{employee.employee_id}</p>
                          </div>
                        </div>
                        <DropdownMenu
                          trigger={
                            <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                              <MoreVertical size={18} />
                            </button>
                          }
                          align="end"
                        >
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Edit className="mr-2" size={16} />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(employee.id)}
                              className="text-red-400"
                            >
                              <Trash2 className="mr-2" size={16} />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2 mb-4">
                        {employee.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail size={14} />
                            <span className="truncate">{employee.email}</span>
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone size={14} />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.position && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">{employee.position}</span>
                          </div>
                        )}
                        {employee.hire_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar size={14} />
                            <span>{new Date(employee.hire_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {employee.salary && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>₹{Number(employee.salary).toLocaleString('en-IN')}</span>
                          </div>
                        )}
                        {employee.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin size={14} />
                            <span className="truncate">{employee.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status?.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {employee.department && (
                          <Badge variant="secondary">{employee.department}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))
      )}

      {/* Add/Edit Employee Modal */}
      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        employee={editingEmployee || undefined}
      />
    </div>
  )
}
