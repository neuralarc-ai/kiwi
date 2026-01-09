import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Search, MoreVertical, Edit, Trash2, Clock, MapPin, DollarSign, Calendar, ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { apiService } from '@/services/api'
import { useToast, ToastContainer } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import AddJobPostingModal from '@/components/AddJobPostingModal'

interface JobPosting {
  id: number
  title: string
  department: string
  position_type: string
  location: string
  description: string
  requirements: string
  salary_range: string
  application_deadline: string
  status: string
  total_applications: number
  created_at: string
}

export default function RecruitmentPage() {
  const { token } = useAuth()
  const { theme } = useTheme()
  const toast = useToast()
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null)

  useEffect(() => {
    fetchJobPostings()
  }, [token])

  const fetchJobPostings = async () => {
    if (!token) return

    try {
      setLoading(true)
      const data = await apiService.getJobPostings(token, 'active')
      setJobPostings(data)
    } catch (error) {
      console.error('Error fetching job postings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!token) return

    try {
      await apiService.deleteJobPosting(id, token)
      toast.success('Job posting deleted successfully')
      fetchJobPostings()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete job posting')
    }
  }

  const handleEdit = (job: JobPosting) => {
    setEditingJob(job)
    setIsModalOpen(true)
  }

  const handleAddNew = () => {
    setEditingJob(null)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingJob(null)
  }

  const handleModalSuccess = () => {
    fetchJobPostings()
    setEditingJob(null)
  }

  // Get unique departments from active job postings
  const availableDepartments = useMemo(() => {
    const deptSet = new Set<string>()
    jobPostings.forEach(job => {
      if (job.department) {
        deptSet.add(job.department)
      }
    })
    return ['All', ...Array.from(deptSet).sort()]
  }, [jobPostings])

  // Filter job postings
  const filteredJobPostings = useMemo(() => {
    let filtered = jobPostings

    // Filter by department
    if (selectedDepartment !== 'All') {
      filtered = filtered.filter(job => job.department === selectedDepartment)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(job =>
        job.title?.toLowerCase().includes(query) ||
        job.department?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [jobPostings, selectedDepartment, searchQuery])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formatSalary = (salaryRange: string) => {
    if (!salaryRange) return 'N/A'
    // Extract numbers from salary range (e.g., "10000-20000" or "10000")
    const numbers = salaryRange.match(/\d+/g)
    if (!numbers || numbers.length === 0) return salaryRange
    
    // Format the first number as rupees in lakhs (L format)
    const salary = parseInt(numbers[0])
    const lakhs = salary / 100000
    if (lakhs >= 1) {
      return `₹${lakhs}L`
    } else {
      // If less than 1 lakh, show in thousands
      const thousands = salary / 1000
      return `₹${thousands}K`
    }
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    <div className="space-y-6 overflow-x-hidden max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 overflow-x-hidden max-w-full"
      >
        <div className="flex-1 min-w-0 overflow-x-hidden">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 gradient-text truncate">Recruitment</h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate">
            Manage job postings ({filteredJobPostings.length} {filteredJobPostings.length === 1 ? 'active job' : 'active jobs'})
          </p>
        </div>
        <Button onClick={handleAddNew} className="w-full sm:w-auto flex-shrink-0 whitespace-nowrap">
          <Plus className="mr-2" size={18} />
          <span className="hidden sm:inline">New Job Posting</span>
          <span className="sm:hidden">New Job</span>
        </Button>
      </motion.div>

      {/* Filter Bar - Unity Style */}
      <Card variant="glass" className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Left side - Dropdowns */}
          <div className="flex flex-wrap gap-3 flex-1">
            {/* Department Dropdown */}
            {availableDepartments.length > 1 && (
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept} {dept !== 'All' && `(${jobPostings.filter(j => j.department === dept).length})`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              </div>
            )}
          </div>

          {/* Right side - Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Small Search Bar */}
            <div className="relative flex-1 sm:flex-initial sm:w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={14} />
          <Input
            variant="glass"
            placeholder="Search job postings..."
                className="pl-8 h-9 text-sm placeholder:opacity-40"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
          </div>
        </div>
      </Card>

      {/* Active Job Postings */}
      {loading ? (
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
      ) : filteredJobPostings.length === 0 ? (
        <Card variant="glass">
          <CardContent className="p-12 text-center">
            <Briefcase className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-lg">
              {searchQuery || selectedDepartment !== 'All'
                ? 'No active job postings found matching your filters'
                : 'No active job postings. Create your first job posting to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {filteredJobPostings.map((job, index) => {
            // Different gradient combinations for light and dark themes
            const gradientVariants = [
              {
                // Light theme gradients
                light: {
                  from: 'from-gray-50',
                  to: 'to-white',
                  hoverFrom: 'hover:from-blue-50',
                  hoverTo: 'hover:to-gray-50'
                },
                // Dark theme gradients
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
              key={job.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
                className="group h-full"
              >
                <div 
                  className={`bg-gradient-to-t ${gradient.light.from} ${gradient.light.to} ${gradient.light.hoverFrom} ${gradient.light.hoverTo} relative before:absolute before:inset-0 before:opacity-5 rounded-2xl border border-gray-200 dark:border-gray-600/50 transition-all duration-500 ease-in-out h-full flex flex-col overflow-hidden shadow-lg hover:shadow-xl`}
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
                >
                  <div className="relative flex flex-col flex-1 p-6 pb-4 z-10">
                    {/* Header with status badge and menu */}
                    <div className="flex items-start justify-between mb-3">
                      {/* Status Badge */}
                      <div className="bg-white dark:bg-gray-800 w-fit px-3 rounded-full text-xs py-1 text-black dark:text-white mb-1">
                        Active
                      </div>
                      <DropdownMenu
                        trigger={
                          <button className="p-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
                            <MoreVertical size={14} className="text-gray-600 dark:text-gray-400 transition-colors" />
                          </button>
                        }
                        align="end"
                      >
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(job)}>
                            <Edit className="mr-2" size={16} />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(job.id)}
                            className="text-red-400"
                          >
                            <Trash2 className="mr-2" size={16} />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Job Title */}
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold pt-2 text-gray-900 dark:text-slate-100 mb-1 line-clamp-2">
                        {job.title}
                      </h3>
                  </div>

                    {/* Job Details with Icons */}
                  <div className="space-y-2 mb-4 flex-1">
                      {/* Employment Type with Clock Icon */}
                    {job.position_type && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                          <Clock size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                          <span>{job.position_type.replace('_', ' ')}</span>
                      </div>
                    )}

                      {/* Location with MapPin Icon */}
                    {job.location && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                          <MapPin size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                          <span>{job.location}</span>
                      </div>
                    )}

                      {/* Salary with DollarSign Icon */}
                    {job.salary_range && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                          <DollarSign size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                          <span>{formatSalary(job.salary_range)}</span>
                      </div>
                    )}

                      {/* Deadline with Calendar Icon */}
                    {job.application_deadline && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-400">
                          <Calendar size={14} className="text-gray-600 dark:text-slate-500 flex-shrink-0" />
                          <span>{formatDate(job.application_deadline)}</span>
                      </div>
                    )}
                    </div>

                    {/* Description */}
                    {job.description && (
                      <div className="mt-auto pt-3 pb-1">
                        <p className="text-sm text-gray-600 dark:text-slate-500 line-clamp-3 break-words">
                        {job.description}
                      </p>
                      </div>
                    )}
                  </div>
                  </div>
            </motion.div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Job Posting Modal */}
      <AddJobPostingModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        job={editingJob}
      />
    </div>
    </>
  )
}
