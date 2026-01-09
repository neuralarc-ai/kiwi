import { motion } from 'framer-motion'
import { User, Mail, Shield, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

export default function ProfilePage() {
  const { user } = useAuth()

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'hr_executive':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'employee':
        return 'bg-green-500/20 text-green-400 dark:bg-[#27584F]/20 dark:text-[#27584F] dark:border-[#27584F]/30 border-green-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator'
      case 'hr_executive':
        return 'HR Executive'
      case 'employee':
        return 'Employee'
      default:
        return role || 'User'
    }
  }

  return (
    <div className="w-full space-y-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 gradient-text">Profile</h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">View your profile information</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
          <Card variant="glass" className="max-w-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white font-bold text-xl sm:text-2xl flex-shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                  <CardTitle className="text-lg sm:text-xl md:text-2xl">User Profile</CardTitle>
                  <Badge className={cn("flex-shrink-0", getRoleBadgeColor(user?.role))}>
                    {getRoleLabel(user?.role)}
                  </Badge>
                </div>
                <CardDescription className="text-xs sm:text-sm">Your account information and details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Mail size={16} />
                  <span>Email Address</span>
                </div>
                <p className="text-base sm:text-lg font-medium break-words">{user?.email || 'N/A'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Shield size={16} />
                  <span>Role</span>
                </div>
                <p className="text-base sm:text-lg font-medium">{getRoleLabel(user?.role)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <User size={16} />
                  <span>Account Status</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 dark:bg-[#27584F]/20 dark:text-[#27584F] dark:border-[#27584F]/30 border-green-500/30">
                  Active
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar size={16} />
                  <span>Member Since</span>
                </div>
                <p className="text-base sm:text-lg font-medium">
                  {new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="glass" className="max-w-2xl">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard/settings"
                className="px-3 sm:px-4 py-2 rounded-lg bg-blue-500/20 text-black dark:text-white border border-blue-500/30 hover:bg-blue-500/30 transition-colors text-sm sm:text-base w-full sm:w-auto text-center"
              >
                Go to Settings
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
