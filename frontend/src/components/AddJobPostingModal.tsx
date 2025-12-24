import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

interface AddJobPostingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  job?: any // For editing
}

export default function AddJobPostingModal({ isOpen, onClose, onSuccess, job }: AddJobPostingModalProps) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    position_type: 'full_time',
    location: 'office',
    description: '',
    requirements: '',
    salary_range: '',
    application_deadline: '',
    status: 'active'
  })

  // Populate form when editing
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        department: job.department || '',
        position_type: job.position_type || 'full_time',
        location: job.location || 'office',
        description: job.description || '',
        requirements: job.requirements || '',
        salary_range: job.salary_range || '',
        application_deadline: job.application_deadline ? job.application_deadline.split('T')[0] : '',
        status: job.status || 'active'
      })
    } else {
      // Reset form for new job
      setFormData({
        title: '',
        department: '',
        position_type: 'full_time',
        location: 'office',
        description: '',
        requirements: '',
        salary_range: '',
        application_deadline: '',
        status: 'active'
      })
    }
  }, [job, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Authentication required')
      return
    }

    if (!formData.title) {
      setError('Job title is required')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      if (job) {
        // Update existing job
        await apiService.updateJobPosting(job.id, formData, token)
      } else {
        // Create new job
        await apiService.createJobPosting(formData, token)
      }
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.message || `Failed to ${job ? 'update' : 'create'} job posting`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto m-2 sm:m-4">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between z-10">
          <h2 className="text-lg sm:text-xl font-bold truncate pr-2">{job ? 'Edit Job Posting' : 'New Job Posting'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Job Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Senior Software Engineer"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Department</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Select Department</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Position Type</label>
              <select
                value={formData.position_type}
                onChange={(e) => setFormData({ ...formData, position_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="office">Office</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Salary Range</label>
            <Input
              value={formData.salary_range}
              onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
              placeholder="e.g., $50,000 - $70,000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Application Deadline</label>
            <Input
              type="date"
              value={formData.application_deadline}
              onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Job Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600"
              placeholder="Describe the role and responsibilities..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Requirements</label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600"
              placeholder="List the required qualifications and skills..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (job ? 'Updating...' : 'Creating...') : (job ? 'Update Job Posting' : 'Create Job Posting')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}



