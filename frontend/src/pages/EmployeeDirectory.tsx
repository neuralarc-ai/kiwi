import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, UserPlus, Edit, Trash2, ChevronDown, List, Grid, Mail, Phone, MapPin, Calendar, MoreVertical, Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { apiService, Employee } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import AddEmployeeModal from '@/components/AddEmployeeModal'
import { useToast, ToastContainer } from '@/components/ui/toast'

export default function EmployeeDirectory() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const toast = useToast()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list')

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
      // Trim and normalize the search query (remove extra spaces)
      const query = searchQuery.toLowerCase().trim().replace(/\s+/g, ' ')
      
      // Only filter if query is not empty after trimming
      if (query) {
        filtered = filtered.filter(emp => {
          // Get full name by combining first and last name (normalize spaces)
          const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
          
          // Check individual fields (normalize spaces)
          const firstName = (emp.first_name || '').toLowerCase().trim()
          const lastName = (emp.last_name || '').toLowerCase().trim()
          const email = (emp.email || '').toLowerCase().trim()
          const employeeId = (emp.employee_id || '').toLowerCase().trim()
          
          // Search in full name, individual fields, email, and employee ID
          // This handles cases like:
          // - "John Doe" matches full name "john doe"
          // - "John" matches first name "john"
          // - "Doe" matches last name "doe"
          // - "john.doe@email.com" matches email
          // - "EMP001" matches employee ID
          return (
            fullName.includes(query) ||
            firstName.includes(query) ||
            lastName.includes(query) ||
            email.includes(query) ||
            employeeId.includes(query)
          )
        })
      }
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
          <div className="flex items-center gap-2">
          <Button onClick={handleAddNew} size="sm" className="w-full sm:w-auto">
            <UserPlus className="mr-2" size={16} />
          Add Employee
        </Button>
          </div>
      </motion.div>

        {/* Filter Bar - Unity Style */}
        <Card variant="glass" className="p-4">
          <div className="flex flex-col gap-3">
            {/* Top row - Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Left side - Dropdowns */}
              <div className="flex flex-wrap gap-3 flex-1 w-full sm:w-auto">
              {/* Department Dropdown */}
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-auto"
                >
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            </div>

              {/* Right side - Search and View Toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Small Search Bar */}
                <div className="relative flex-1 sm:flex-initial sm:w-[200px] min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={14} />
          <Input
            variant="glass"
                    placeholder="Search employees..."
                    className="pl-8 pr-3 py-1.5 h-9 text-sm w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
                </div>
                
                {/* View Toggle Buttons */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 flex-shrink-0">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 px-2 sm:px-3 min-w-[36px]"
                    aria-label="List view"
                  >
                    <List size={16} />
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="h-8 px-2 sm:px-3 min-w-[36px]"
                    aria-label="Card view"
                  >
                    <Grid size={16} />
                  </Button>
                </div>
        </div>
            </div>
          </div>
        </Card>

        {/* Content - List or Cards View */}
        {loading ? (
          viewMode === 'list' ? (
        <Card variant="glass" className="overflow-hidden">
          <CardContent className="p-0">
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} variant="glass">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )
      ) : filteredEmployees.length === 0 ? (
          <Card variant="glass">
            <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">
              {searchQuery || selectedDepartment !== 'All'
                ? 'No employees found matching your filters'
                : 'No employees found. Add your first employee to get started.'}
            </p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          /* List View - Table */
          <Card variant="glass" className="overflow-hidden">
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        ) : (
          /* Cards View - Similar to Recruitment */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {filteredEmployees.map((employee, index) => {
              // Same gradient combinations as recruitment cards
              const gradientVariants = [
                {
                  light: {
                    from: 'from-gray-50',
                    to: 'to-white',
                    hoverFrom: 'hover:from-blue-50',
                    hoverTo: 'hover:to-gray-50'
                  },
                  dark: {
                    from: 'from-[#242424]',
                    to: 'to-[#020202]',
                    hoverFrom: 'hover:from-[#182135]',
                    hoverTo: 'hover:to-[#080808]'
                  }
                },
                {
                  light: {
                    from: 'from-gray-100',
                    to: 'to-gray-50',
                    hoverFrom: 'hover:from-purple-50',
                    hoverTo: 'hover:to-gray-100'
                  },
                  dark: {
                    from: 'from-[#050a0a]',
                    to: 'to-[#051818]',
                    hoverFrom: 'hover:from-[#05070a]',
                    hoverTo: 'hover:to-[#0b1a3b]'
                  }
                },
                {
                  light: {
                    from: 'from-blue-50',
                    to: 'to-white',
                    hoverFrom: 'hover:from-indigo-50',
                    hoverTo: 'hover:to-blue-50'
                  },
                  dark: {
                    from: 'from-[#171c35]',
                    to: 'to-[#000000]',
                    hoverFrom: 'hover:from-[#2b131e]',
                    hoverTo: 'hover:to-[#141414]'
                  }
                }
              ]
              const gradient = gradientVariants[index % gradientVariants.length]
              const isDark = theme === 'dark'
              
              // Get gradient style based on theme
              const getGradientStyle = (from: string, to: string) => {
                if (isDark) {
                  const fromColor = from.replace('from-[#', '').replace(']', '')
                  const toColor = to.replace('to-[#', '').replace(']', '')
                  return `linear-gradient(to top, #${fromColor}, #${toColor})`
                }
                return undefined
              }
              
              const baseGradient = getGradientStyle(gradient.dark.from, gradient.dark.to)
              const hoverGradient = getGradientStyle(
                gradient.dark.hoverFrom.replace('hover:from-[#', 'from-[#'),
                gradient.dark.hoverTo.replace('hover:to-[#', 'to-[#')
              )

              return (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="group h-full"
                >
                  <div 
                    className={`bg-gradient-to-t ${gradient.light.from} ${gradient.light.to} ${gradient.light.hoverFrom} ${gradient.light.hoverTo} relative before:absolute before:inset-0 before:opacity-5 rounded-2xl border border-gray-200 dark:border-gray-600/50 transition-all duration-500 ease-in-out h-full flex flex-col overflow-hidden shadow-lg hover:shadow-xl cursor-pointer`}
                    style={isDark ? { background: baseGradient } : undefined}
                    onMouseEnter={(e) => {
                      if (isDark && hoverGradient) {
                        e.currentTarget.style.background = hoverGradient
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isDark && baseGradient) {
                        e.currentTarget.style.background = baseGradient
                      }
                    }}
                    onClick={() => navigate(`/dashboard/employee/${employee.id}`)}
                  >
                    <div className="relative flex flex-col flex-1 p-6 pb-4 z-10">
                      {/* Header with status badge and menu */}
                      <div className="flex items-start justify-between mb-3">
                        {/* Status Badge */}
                        <div className="flex-shrink-0">
                          {getStatusBadge(employee.status || 'active')}
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu
                            trigger={
                              <button 
                                type="button"
                                className="p-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                              >
                                <MoreVertical size={14} className="text-gray-600 dark:text-gray-400 transition-colors" />
                              </button>
                            }
                            align="end"
                          >
                          <DropdownMenuContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => {
                              handleEdit(employee)
                            }}>
                              <Edit className="mr-2" size={16} />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                handleDelete(employee.id)
                              }}
                              className="text-red-400"
                            >
                              <Trash2 className="mr-2" size={16} />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Employee Name */}
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold pt-2 text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        {employee.employee_id && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {employee.employee_id}
                          </p>
                        )}
                      </div>

                      {/* Employee Details with Icons */}
                      <div className="space-y-2 mb-4 flex-1">
                        {/* Email with Mail Icon */}
                        {employee.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                            <Mail size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                            <span className="truncate">{employee.email}</span>
                          </div>
                        )}

                        {/* Department */}
                        {employee.department && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                            <MapPin size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                            <span>{employee.department}</span>
                          </div>
                        )}

                        {/* Position */}
                        {employee.position && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                            <Briefcase size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                            <span>{employee.position}</span>
                          </div>
                        )}

                        {/* Phone */}
                        {employee.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                            <Phone size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                            <span>{employee.phone}</span>
                          </div>
                        )}

                        {/* Hire Date with Calendar Icon */}
                        {employee.hire_date && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                            <Calendar size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                            <span>{formatDate(employee.hire_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

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
