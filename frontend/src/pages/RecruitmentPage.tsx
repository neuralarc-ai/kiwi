import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Search, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { apiService } from '@/services/api'
import { useToast, ToastContainer } from '@/components/ui/toast'
import { useAuth } from '@/contexts/AuthContext'
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
    if (!token || !confirm('Are you sure you want to delete this job posting?')) return

    try {
      await apiService.deleteJobPosting(id, token)
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
    return new Date(dateString).toLocaleDateString()
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
            placeholder="Search job postings..."
            className="pl-9 w-full text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Department Filter Tags - Only show departments that have active jobs */}
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
              {dept} {dept !== 'All' && `(${jobPostings.filter(j => j.department === dept).length})`}
            </Badge>
          ))}
        </motion.div>
      )}

      {/* Active Job Postings */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredJobPostings.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card variant="glass" className="h-full flex flex-col">
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <Briefcase className="text-blue-500" size={24} />
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Active
                      </Badge>
                      <DropdownMenu
                        trigger={
                          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                            <MoreVertical size={18} />
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
                  </div>

                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{job.title}</h3>

                  <div className="space-y-2 mb-4 flex-1">
                    {job.department && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Department:</span>
                        <Badge variant="secondary">{job.department}</Badge>
                      </div>
                    )}
                    {job.position_type && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Type:</span> {job.position_type.replace('_', ' ')}
                      </div>
                    )}
                    {job.location && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Location:</span> {job.location}
                      </div>
                    )}
                    {job.salary_range && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Salary:</span> {job.salary_range}
                      </div>
                    )}
                    {job.application_deadline && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Deadline:</span> {formatDate(job.application_deadline)}
                      </div>
                    )}
                    {job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {job.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
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
