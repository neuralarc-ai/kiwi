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
  X,
  Building2
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'
import RoyalBrandTitle from '@/components/home/RoyalBrandTitle'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Employees', path: '/dashboard/employees' },
  { icon: Calendar, label: 'Attendance', path: '/dashboard/attendance' },
  { icon: Briefcase, label: 'Recruitment', path: '/dashboard/recruitment' },
  { icon: DollarSign, label: 'Payroll Management', path: '/dashboard/payroll' },
  { icon: Building2, label: 'Vendors', path: '/dashboard/vendors' },
  { icon: TrendingUp, label: 'Performance', path: '/dashboard/performance' },
  { icon: Calculator, label: 'Account', path: '/dashboard/account' },
  { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
]

export default function Sidebar() {
  const { isCollapsed, isMobile, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebar()

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
          "fixed left-0 top-0 h-screen glass-strong z-50",
          isMobile 
            ? "w-[280px] sm:w-64"
            : (isCollapsed ? "w-20" : "w-64"),
          isMobile && !isMobileOpen && "pointer-events-none"
        )}
        style={{
          willChange: 'transform',
        }}
      >
      <div className="flex flex-col h-full p-3 sm:p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-6 sm:mb-8 flex-shrink-0">
          {(!isCollapsed || isMobile) && (
            <RoyalBrandTitle 
              size="sm" 
              showSubtitle={false} 
              variant="navbar"
              className="flex-shrink-0 min-w-0"
            />
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg active:bg-white/20 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
          >
            {isMobile ? (isMobileOpen ? <X size={20} /> : <Menu size={20} />) : (isCollapsed ? <Menu size={20} /> : <X size={20} />)}
          </button>
        </div>

        <nav className="flex-1 space-y-1 sm:space-y-2 overflow-y-auto overflow-x-hidden min-h-0">
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
              style={({ isActive }) => isActive ? { backgroundColor: 'oklch(94% .01 60)', color: 'black' } : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-all duration-300 group relative overflow-visible min-h-[44px] w-full",
                  isActive
                    ? "text-black border"
                    : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex-shrink-0 relative z-10"
                  >
                    <item.icon 
                      size={isMobile ? 18 : 20} 
                      className=""
                      style={isActive ? { color: 'black' } : undefined}
                    />
                  </motion.div>
                  {(!isCollapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="font-medium text-sm sm:text-base truncate relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isCollapsed && !isMobile && (
                    <motion.span
                      className="hidden absolute left-full ml-2 px-2 py-1 rounded bg-white dark:bg-gray-800 shadow-lg whitespace-nowrap z-50 text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-lg z-0"
                      style={{ backgroundColor: 'oklch(94% .01 60)' }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </motion.aside>
    </>
  )
}

