import { motion } from 'framer-motion'
import { User, Shield, DollarSign, Settings as SettingsIcon, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'
import { useToast, ToastContainer } from '@/components/ui/toast'

export default function SettingsPage() {
  const { user, token } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [payrollConfig, setPayrollConfig] = useState({
    tds_percentage: '10',
    max_allowed_leaves: '2',
    working_days_per_month: '30',
  })
  const [leaveAllocations, setLeaveAllocations] = useState({
    clAllocation: '12',
    slAllocation: '12',
    plAllocation: '15',
    lwpAllocation: '0',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Fetch payroll settings on mount
  useEffect(() => {
    const fetchPayrollSettings = async () => {
      if (!token) return
      
      try {
        const settings = await apiService.getSettings(token)
        const settingsMap: Record<string, string> = {}
        settings.forEach((setting: any) => {
          settingsMap[setting.setting_key] = setting.setting_value
        })
        
        setPayrollConfig({
          tds_percentage: settingsMap['payroll_tds_percentage'] || '10',
          max_allowed_leaves: settingsMap['payroll_max_allowed_leaves'] || '2',
          working_days_per_month: settingsMap['payroll_working_days_per_month'] || '30',
        })
        
        // Fetch leave allocations
        setLeaveAllocations({
          clAllocation: settingsMap['leave_cl_allocation'] || '12',
          slAllocation: settingsMap['leave_sl_allocation'] || '12',
          plAllocation: settingsMap['leave_pl_allocation'] || '15',
          lwpAllocation: settingsMap['leave_lwp_allocation'] || '0',
        })
      } catch (error) {
        console.error('Error fetching payroll settings:', error)
      }
    }
    
    fetchPayrollSettings()
  }, [token])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.warning('New passwords do not match')
      return
    }

    if (passwordData.new_password.length < 8) {
      toast.warning('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    // TODO: Implement password update API call
    setTimeout(() => {
      setLoading(false)
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      toast.success('Password updated successfully')
    }, 1000)
  }

  const handlePayrollConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      toast.warning('Please log in to update settings')
      return
    }

    // Validate inputs
    const tdsPercentage = parseFloat(payrollConfig.tds_percentage)
    const maxLeaves = parseFloat(payrollConfig.max_allowed_leaves)
    const workingDays = parseFloat(payrollConfig.working_days_per_month)

    if (isNaN(tdsPercentage) || tdsPercentage < 0 || tdsPercentage > 100) {
      toast.warning('TDS percentage must be between 0 and 100')
      return
    }

    if (isNaN(maxLeaves) || maxLeaves < 0) {
      toast.warning('Max allowed leaves must be a positive number')
      return
    }

    if (isNaN(workingDays) || workingDays < 1 || workingDays > 31) {
      toast.warning('Working days per month must be between 1 and 31')
      return
    }

    setPayrollLoading(true)
    try {
      await apiService.updateSettings(token, [
        { key: 'payroll_tds_percentage', value: payrollConfig.tds_percentage },
        { key: 'payroll_max_allowed_leaves', value: payrollConfig.max_allowed_leaves },
        { key: 'payroll_working_days_per_month', value: payrollConfig.working_days_per_month },
      ])
      toast.success('Payroll configuration updated successfully')
    } catch (error: any) {
      console.error('Error updating payroll settings:', error)
      toast.error(error?.message || 'Failed to update payroll configuration')
    } finally {
      setPayrollLoading(false)
    }
  }

  const handleLeaveAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      toast.warning('Please log in to update settings')
      return
    }

    setIsSaving(true)
    try {
      await apiService.updateSettings(token, [
        { key: 'leave_cl_allocation', value: leaveAllocations.clAllocation },
        { key: 'leave_sl_allocation', value: leaveAllocations.slAllocation },
        { key: 'leave_pl_allocation', value: leaveAllocations.plAllocation },
        { key: 'leave_lwp_allocation', value: leaveAllocations.lwpAllocation },
      ])
      toast.success('Leave allocations updated successfully')
    } catch (error: any) {
      console.error('Error updating leave allocations:', error)
      toast.error(error?.message || 'Failed to update leave allocations')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <div className="space-y-6 overflow-x-hidden max-w-full">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 gradient-text">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your account settings and preferences</p>
      </motion.div>

      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/20">
                <User className="text-black dark:text-white" size={24} />
              </div>
              <div className="space-y-1">
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription className="leading-relaxed">Manage your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  variant="glass"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Input
                  variant="glass"
                  value={user?.role ? user.role.replace('_', ' ').toUpperCase() : ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">Role cannot be changed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Security Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-500/20">
                <Shield className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <div className="space-y-1">
                <CardTitle>Security</CardTitle>
                <CardDescription className="leading-relaxed">Manage your password and security settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  variant="glass"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Enter current password"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                  variant="glass"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  variant="glass"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Payroll Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/20">
                <DollarSign className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div className="space-y-1">
                <CardTitle>Payroll Configuration</CardTitle>
                <CardDescription className="leading-relaxed">
                  Configure TDS percentage, allowed leaves, and working days for payroll calculations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handlePayrollConfigSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-medium">TDS Percentage (%)</label>
                  <Input
                    variant="glass"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={payrollConfig.tds_percentage}
                    onChange={(e) => setPayrollConfig({ ...payrollConfig, tds_percentage: e.target.value })}
                    placeholder="10"
                    required
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tax Deducted at Source percentage (0-100%)
                  </p>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Max Allowed Leaves</label>
                  <Input
                    variant="glass"
                    type="number"
                    min="0"
                    step="1"
                    value={payrollConfig.max_allowed_leaves}
                    onChange={(e) => setPayrollConfig({ ...payrollConfig, max_allowed_leaves: e.target.value })}
                    placeholder="2"
                    required
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Maximum leave days per month before deduction
                  </p>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium">Working Days per Month</label>
                  <Input
                    variant="glass"
                    type="number"
                    min="1"
                    max="31"
                    step="1"
                    value={payrollConfig.working_days_per_month}
                    onChange={(e) => setPayrollConfig({ ...payrollConfig, working_days_per_month: e.target.value })}
                    placeholder="30"
                    required
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Number of working days in a month
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={payrollLoading}>
                  {payrollLoading ? 'Updating...' : 'Update Payroll Configuration'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leave Type Allocations */}
      {(user?.role === 'admin' || user?.role === 'hr_executive') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-500/20">
                  <SettingsIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-1">
                  <CardTitle>Annual Leave Allocations</CardTitle>
                  <CardDescription className="leading-relaxed">
                    Configure yearly leave entitlements by type
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleLeaveAllocationSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-3">
                    <Label htmlFor="clAllocation">Casual Leave (CL) - Annual</Label>
                    <Input
                      id="clAllocation"
                      variant="glass"
                      type="number"
                      min="0"
                      value={leaveAllocations.clAllocation}
                      onChange={(e) =>
                        setLeaveAllocations({ ...leaveAllocations, clAllocation: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Annual allocation for casual leaves (default: 12 days)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="slAllocation">Sick Leave (SL) - Annual</Label>
                    <Input
                      id="slAllocation"
                      variant="glass"
                      type="number"
                      min="0"
                      value={leaveAllocations.slAllocation}
                      onChange={(e) =>
                        setLeaveAllocations({ ...leaveAllocations, slAllocation: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Annual allocation for sick leaves (default: 12 days)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="plAllocation">Privilege Leave (PL) - Annual</Label>
                    <Input
                      id="plAllocation"
                      variant="glass"
                      type="number"
                      min="0"
                      value={leaveAllocations.plAllocation}
                      onChange={(e) =>
                        setLeaveAllocations({ ...leaveAllocations, plAllocation: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Annual allocation for privilege/earned leaves (default: 15 days)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="lwpAllocation">Leave Without Pay (LWP)</Label>
                    <Input
                      id="lwpAllocation"
                      variant="glass"
                      type="number"
                      min="0"
                      value={leaveAllocations.lwpAllocation}
                      onChange={(e) =>
                        setLeaveAllocations({ ...leaveAllocations, lwpAllocation: e.target.value })
                      }
                      required
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Unlimited (leave without salary)
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border">
                  <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Leave Allocations"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Info Cards */}
      {(user?.role === 'admin' || user?.role === 'hr_executive') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card variant="glass" className="bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 text-base">Salary Calculation</h3>
                <p className="text-sm text-muted-foreground">
                  Net Salary = Gross Salary - TDS - Leave Deductions
                </p>
              </CardContent>
            </Card>
            <Card variant="glass" className="bg-purple-50/50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2 text-base">Leave Deduction</h3>
                <p className="text-sm text-muted-foreground">
                  (Salary / Working Days) × Excess Leaves
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
      
    </div>
    </>
  )
}

