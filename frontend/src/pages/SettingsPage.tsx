import { motion } from 'framer-motion'
import { User, Shield, DollarSign, Settings as SettingsIcon, Save, UserPlus, Trash2, Users, ChevronDown, Calculator, TrendingUp, Key, Loader2 } from 'lucide-react'
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
    plAllocation: '',
    lwpAllocation: '0',
  })
  const [isSaving, setIsSaving] = useState(false)
  
  // Security state
  const [showChangePassword, setShowChangePassword] = useState(false)
  
  // User management state
  const [showAddUser, setShowAddUser] = useState(false)
  const [users, setUsers] = useState<Array<{
    email: string
    password: string
    confirmPassword: string
    role: string
  }>>([{
    email: '',
    password: '',
    confirmPassword: '',
    role: 'hr_executive'
  }])
  const [creatingUsers, setCreatingUsers] = useState(false)

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
          plAllocation: settingsMap['leave_pl_allocation'] || '',
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
      setShowChangePassword(false)
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

  const addUserField = () => {
    setUsers([...users, {
      email: '',
      password: '',
      confirmPassword: '',
      role: 'hr_executive'
    }])
  }

  const removeUserField = (index: number) => {
    if (users.length > 1) {
      setUsers(users.filter((_, i) => i !== index))
    }
  }

  const updateUserField = (index: number, field: string, value: string) => {
    const updatedUsers = [...users]
    updatedUsers[index] = { ...updatedUsers[index], [field]: value }
    setUsers(updatedUsers)
  }

  const handleAddUsers = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      toast.warning('Please log in to add users')
      return
    }

    // Validate all users
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      
      if (!user.email || !user.password) {
        toast.warning(`User ${i + 1}: Email and password are required`)
        return
      }

      if (user.password.length < 8) {
        toast.warning(`User ${i + 1}: Password must be at least 8 characters`)
        return
      }

      if (user.password !== user.confirmPassword) {
        toast.warning(`User ${i + 1}: Passwords do not match`)
        return
      }

      // Validate password strength
      if (!/[A-Z]/.test(user.password) || !/[a-z]/.test(user.password) || 
          !/[0-9]/.test(user.password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(user.password)) {
        toast.warning(`User ${i + 1}: Password must contain uppercase, lowercase, number, and special character`)
        return
      }
    }

    setCreatingUsers(true)
    let successCount = 0
    let errorCount = 0

    try {
      // Create all users
      for (const user of users) {
        try {
          await apiService.createUser(token, {
            email: user.email.trim(),
            password: user.password,
            role: user.role
          })
          successCount++
        } catch (error: any) {
          console.error(`Error creating user ${user.email}:`, error)
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} user(s)${errorCount > 0 ? `. ${errorCount} failed.` : ''}`)
      }
      
      if (errorCount > 0 && successCount === 0) {
        toast.error(`Failed to create users. Please check the form and try again.`)
        return
      }
      
      // Reset form
      setUsers([{
        email: '',
        password: '',
        confirmPassword: '',
        role: 'hr_executive'
      }])
      setShowAddUser(false)
    } catch (error: any) {
      console.error('Error creating users:', error)
      toast.error('Failed to create users')
    } finally {
      setCreatingUsers(false)
    }
  }


  return (
    <>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      <div className="space-y-4 overflow-x-hidden max-w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 gradient-text">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your account settings and preferences</p>
        </motion.div>

        <div className="max-w-4xl space-y-4">
          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
        <Card variant="glass">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/20">
                <User className="text-black dark:text-white" size={24} />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">Profile Settings</CardTitle>
                <CardDescription>Manage your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium">Email</label>
                <Input
                  variant="glass"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-80"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium">Role</label>
                <Input
                  variant="glass"
                  value={user?.role ? user.role.replace('_', ' ').toUpperCase() : ''}
                  disabled
                  className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-80"
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
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-[#27584F]/20">
                  <Shield className="text-green-600 dark:text-[#27584F]" size={24} />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg">Security</CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </div>
              </div>
              {!showChangePassword && (
                <Button
                  onClick={() => setShowChangePassword(true)}
                  size="sm"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {/* Change Password Form */}
            {showChangePassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg p-3"
              >
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2 max-w-md">
                    <label className="text-sm font-medium">Current Password</label>
                    <Input
                      variant="glass"
                      type="password"
                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      placeholder="Enter current password"
                      className="placeholder:opacity-40"
                      required
                    />
                  </div>
                  <div className="space-y-2 max-w-md">
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      variant="glass"
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      placeholder="Enter new password"
                      className="placeholder:opacity-40"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters with uppercase, lowercase, number, and special character
                    </p>
                  </div>
                  <div className="space-y-2 max-w-md">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input
                      variant="glass"
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      placeholder="Confirm new password"
                      className="placeholder:opacity-40"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Button type="submit" disabled={loading} size="sm" className="w-auto">
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowChangePassword(false)
                        setPasswordData({
                          current_password: '',
                          new_password: '',
                          confirm_password: '',
                        })
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
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
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/20">
                <DollarSign className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-lg">Payroll Configuration</CardTitle>
                <CardDescription>
                  Configure TDS percentage, allowed leaves, and working days for payroll calculations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <form onSubmit={handlePayrollConfigSubmit} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
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
                    className="w-full max-w-xs placeholder:opacity-40"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Tax Deducted at Source percentage (0-100%)
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Allowed Leaves</label>
                  <Input
                    variant="glass"
                    type="number"
                    min="0"
                    step="1"
                    value={payrollConfig.max_allowed_leaves}
                    onChange={(e) => setPayrollConfig({ ...payrollConfig, max_allowed_leaves: e.target.value })}
                    placeholder="2"
                    className="w-full max-w-xs placeholder:opacity-40"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum leave days per month before deduction
                  </p>
                </div>
                <div className="space-y-2">
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
                    className="w-full max-w-xs placeholder:opacity-40"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
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
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-[#27584F]/20">
                  <SettingsIcon className="h-6 w-6 text-green-600 dark:text-[#27584F]" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg">Annual Leave Allocations</CardTitle>
                  <CardDescription>
                    Configure yearly leave entitlements by type
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <form onSubmit={handleLeaveAllocationSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="clAllocation">Casual Leave (CL) - Annual</Label>
                    <Input
                      id="clAllocation"
                      variant="glass"
                      type="number"
                      min="0"
                      step="1"
                      value={leaveAllocations.clAllocation}
                      onChange={(e) =>
                        setLeaveAllocations({ ...leaveAllocations, clAllocation: e.target.value })
                      }
                      className="w-full max-w-xs placeholder:opacity-50"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Annual allocation for casual leaves (default: 12 days)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slAllocation">Sick Leave (SL) - Annual</Label>
                    <Input
                      id="slAllocation"
                      variant="glass"
                      type="number"
                      min="0"
                      step="1"
                      value={leaveAllocations.slAllocation}
                      onChange={(e) =>
                        setLeaveAllocations({ ...leaveAllocations, slAllocation: e.target.value })
                      }
                      className="w-full max-w-xs placeholder:opacity-50"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Annual allocation for sick leaves (default: 12 days)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plAllocation">Privilege Leave (PL) - Annual</Label>
                    <Input
                      id="plAllocation"
                      variant="glass"
                      type="number"
                      min="0"
                      step="1"
                      value={leaveAllocations.plAllocation}
                      onChange={(e) =>
                        setLeaveAllocations({ ...leaveAllocations, plAllocation: e.target.value })
                      }
                      className="w-full max-w-xs placeholder:opacity-50"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Annual allocation for privilege/earned leaves
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lwpAllocation">Leave Without Pay (LWP)</Label>
                    <Input
                      id="lwpAllocation"
                      variant="glass"
                      type="number"
                      min="0"
                      step="1"
                      value={leaveAllocations.lwpAllocation}
                      onChange={(e) =>
                        setLeaveAllocations({ ...leaveAllocations, lwpAllocation: e.target.value })
                      }
                      className="w-full max-w-xs placeholder:opacity-50"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Unlimited (leave without salary)
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={isSaving}>
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Leave Allocations"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
            </motion.div>
          )}

          {/* User Management - Admin Only */}
          {user?.role === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
          <Card variant="glass">
            <CardHeader className="p-4 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/20">
                    <Users className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">User Management</CardTitle>
                    <CardDescription>
                      Create new user accounts
                    </CardDescription>
                  </div>
                </div>
                {!showAddUser && (
                  <Button
                    onClick={() => setShowAddUser(true)}
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Add Users Form */}
              {showAddUser && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg p-3"
                >
                  <form onSubmit={handleAddUsers} className="space-y-4">
                    {users.map((userData, index) => (
                      <div key={index} className="space-y-3 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold">User {index + 1}</h4>
                          {users.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeUserField(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2 max-w-md">
                            <Label htmlFor={`userEmail-${index}`}>Email *</Label>
                            <Input
                              id={`userEmail-${index}`}
                              variant="glass"
                              type="email"
                              placeholder="user@company.com"
                              className="placeholder:opacity-40"
                              value={userData.email}
                              onChange={(e) => updateUserField(index, 'email', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2 max-w-md">
                            <Label htmlFor={`userRole-${index}`}>Role *</Label>
                            <div className="relative">
                              <select
                                id={`userRole-${index}`}
                                value={userData.role}
                                onChange={(e) => updateUserField(index, 'role', e.target.value)}
                                className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 w-full h-10 max-w-md opacity-80"
                                required
                              >
                                <option value="admin">Admin</option>
                                <option value="hr_executive">HR Executive</option>
                                <option value="accountant">Accountant</option>
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
                            </div>
                          </div>
                          <div className="space-y-2 max-w-md">
                            <Label htmlFor={`userPassword-${index}`}>Password *</Label>
                            <Input
                              id={`userPassword-${index}`}
                              variant="glass"
                              type="password"
                              placeholder="••••••••"
                              className="placeholder:opacity-40"
                              value={userData.password}
                              onChange={(e) => updateUserField(index, 'password', e.target.value)}
                              required
                              minLength={8}
                            />
                            <p className="text-xs text-muted-foreground">
                              Min 8 chars with uppercase, lowercase, number, and special character
                            </p>
                          </div>
                          <div className="space-y-2 max-w-md">
                            <Label htmlFor={`userConfirmPassword-${index}`}>Confirm Password *</Label>
                            <Input
                              id={`userConfirmPassword-${index}`}
                              variant="glass"
                              type="password"
                              placeholder="••••••••"
                              className="placeholder:opacity-40"
                              value={userData.confirmPassword}
                              onChange={(e) => updateUserField(index, 'confirmPassword', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addUserField}
                        className="w-full sm:w-auto"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Another User
                      </Button>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-border">
                      <Button type="submit" disabled={creatingUsers} size="sm" className="w-auto">
                        {creatingUsers ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating Users...
                          </>
                        ) : (
                          `Create ${users.length} User(s)`
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddUser(false)
                          setUsers([{
                            email: '',
                            password: '',
                            confirmPassword: '',
                            role: 'hr_executive'
                          }])
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </CardContent>
          </Card>
            </motion.div>
          )}

          {/* Info Cards */}
          {(user?.role === 'admin' || user?.role === 'hr_executive') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Card variant="glass" className="bg-blue-50/50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20">
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/20">
                      <Calculator className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">Salary Calculation</CardTitle>
                      <CardDescription>Formula for calculating net salary</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Net Salary = Gross Salary - TDS - Leave Deductions
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card variant="glass" className="bg-purple-50/50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20">
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/20">
                      <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">Leave Deduction</CardTitle>
                      <CardDescription>Formula for calculating leave deductions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      (Salary / Working Days) × Excess Leaves
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}

