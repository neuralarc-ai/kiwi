import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Briefcase, 
  Settings,
  DollarSign,
  TrendingUp,
  Calculator,
  Menu,
  ChevronLeft,
  Building2,
  Sun,
  Moon,
  LogOut
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useSidebar } from '@/contexts/SidebarContext'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Calendar, label: 'Attendance', path: '/dashboard/attendance' },
  { icon: Briefcase, label: 'Recruitment', path: '/dashboard/recruitment' },
  { icon: DollarSign, label: 'Payroll Management', path: '/dashboard/payroll' },
  { icon: Building2, label: 'Vendors', path: '/dashboard/vendors' },
  { icon: Users, label: 'Employees', path: '/dashboard/employees' },
  { icon: TrendingUp, label: 'Performance', path: '/dashboard/performance' },
  { icon: Calculator, label: 'Account', path: '/dashboard/account' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
]

export default function Sidebar() {
  const { isCollapsed, isMobile, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebar()
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeMobileSidebar}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          style={{ willChange: 'opacity' }}
        />
      )}

      <motion.aside
        initial={false}
        animate={{ 
          x: isMobile && !isMobileOpen ? '-100%' : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          "fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 shadow-xl",
          isMobile 
            ? "w-[260px] sm:w-64"
            : (isCollapsed ? "w-16" : "w-56"),
          isMobile && !isMobileOpen && "pointer-events-none"
        )}
        style={{
          willChange: 'transform',
        }}
      >
      <div className={cn(
        "flex flex-col h-full overflow-hidden",
        isCollapsed && !isMobile ? "p-2" : "p-3 sm:p-4"
      )}>
        {/* Logo and Close Button */}
        <div className={cn(
          "flex items-center mb-6 flex-shrink-0",
          isCollapsed && !isMobile ? "flex-col gap-3" : "justify-between"
        )}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              "flex items-center justify-center flex-shrink-0 rounded-lg",
              isCollapsed && !isMobile ? "w-full" : "w-auto",
              // White background in light mode, black in dark mode
              "bg-white dark:bg-black p-1.5 dark:shadow-md"
            )}
          >
            <img
              src={theme === 'dark' ? "/logo/logo1.png" : "/logo/logo.png"}
              alt="KIWI Logo"
              className={cn(
                "object-contain transition-all duration-300",
                isCollapsed && !isMobile ? "w-8 h-8" : "w-10 h-10 sm:w-12 sm:h-12"
              )}
              onError={(e) => {
                // Fallback if logo doesn't exist
                console.error('Logo image failed to load')
                e.currentTarget.style.display = 'none'
              }}
            />
          </motion.div>
          <button
            onClick={toggleSidebar}
            className={cn(
              "p-2 rounded-lg flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              isCollapsed && !isMobile && "w-full"
            )}
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            style={{ color: 'hsl(var(--palette-dark-green))' }}
          >
            {isMobile ? (
              isMobileOpen ? <ChevronLeft size={20} /> : <Menu size={20} />
            ) : (
              isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />
            )}
          </button>
        </div>

        {/* Admin Tools Heading */}
        {(!isCollapsed || isMobile) && (
          <div className="mb-4 px-3">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Admin tools
            </h3>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden min-h-0">
          {menuItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                // Auto-close sidebar on mobile when navigating
                if (isMobile) {
                  setTimeout(() => closeMobileSidebar(), 100)
                }
              }}
              style={({ isActive }) => {
                if (!isActive) return undefined
                // Use dark color for Dashboard, light color for others
                if (item.path === '/dashboard') {
                  return { backgroundColor: 'hsl(var(--palette-light-purple))' }
                }
                return { backgroundColor: 'hsl(var(--palette-light-purple) / 0.3)' }
              }}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-visible min-h-[44px] w-full",
                  isCollapsed && !isMobile && "justify-center px-2 gap-0",
                  isActive
                    ? "text-gray-900 dark:text-white font-medium"
                    : "text-gray-600 dark:text-gray-400"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex-shrink-0 relative z-10 flex items-center justify-center",
                      isCollapsed && !isMobile && "w-full"
                    )}
                  >
                    <item.icon 
                      size={
                        isMobile ? 18 
                        : isCollapsed ? 20 
                        : 20
                      } 
                      className={cn(
                        "transition-transform",
                        isActive 
                          ? "text-gray-900 dark:text-white" 
                          : "text-gray-600 dark:text-gray-400"
                      )} 
                    />
                  </motion.div>
                  {(!isCollapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm truncate relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isCollapsed && !isMobile && (
                    <motion.span
                      className="hidden group-hover:block absolute left-full ml-2 px-2 py-1 rounded bg-white dark:bg-gray-800 shadow-lg whitespace-nowrap z-50 text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-lg z-0"
                      style={{ 
                        backgroundColor: item.path === '/dashboard' 
                          ? 'hsl(var(--palette-light-purple))' 
                          : 'hsl(var(--palette-light-purple) / 0.3)' 
                      }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section - Theme Toggle and Logout */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2 flex-shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={cn(
              "w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400",
              isCollapsed && !isMobile ? "justify-center px-2 gap-0" : "gap-3 justify-start"
            )}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Sun size={isMobile ? 18 : isCollapsed ? 20 : 20} />
            ) : (
              <Moon size={isMobile ? 18 : isCollapsed ? 20 : 20} />
            )}
            {(!isCollapsed || isMobile) && (
              <span className="text-sm font-medium">
                {theme === 'light' ? 'Light' : 'Dark'}
              </span>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300",
              isCollapsed && !isMobile ? "justify-center px-2 gap-0" : "gap-3 justify-start"
            )}
          >
            <LogOut 
              size={isMobile ? 18 : isCollapsed ? 20 : 20} 
              style={{ color: 'hsl(var(--palette-red-orange))' }}
            />
            {(!isCollapsed || isMobile) && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      </div>
    </motion.aside>
    </>
  )
}

