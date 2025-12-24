import { motion } from 'framer-motion'
import { User, LogOut, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import { useAuth } from '@/contexts/AuthContext'

import { useSidebar } from '@/contexts/SidebarContext'
import { Menu } from 'lucide-react'

export default function Navbar() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const { isMobile, openMobileSidebar } = useSidebar()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-30 glass-strong border-b border-white/10 overflow-x-hidden max-w-full"
      style={{ position: 'sticky' }}
    >
      <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-3 overflow-x-hidden max-w-full w-full min-w-0">
        {/* Left side - Mobile menu button and Home button */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-w-0">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={openMobileSidebar}
              className="p-1.5 sm:p-2 rounded-lg glass hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu size={18} className="sm:w-5 sm:h-5" />
            </button>
          )}
          {!isMobile && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/home')}
              className="p-1.5 sm:p-2 rounded-lg glass hover:bg-white/20 transition-colors flex-shrink-0"
              title="Go to Home"
            >
              <Home size={18} className="sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </motion.button>
          )}
        </div>

        {/* Right side - Theme, User, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
          <div className="flex-shrink-0">
            <ThemeSwitcher />
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard/profile')}
            className="p-1.5 sm:p-2 rounded-full glass cursor-pointer relative group hover:bg-white/20 transition-colors flex-shrink-0"
            title={user?.email || 'User'}
          >
            <User size={18} className="sm:w-5 sm:h-5" />
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-1.5 sm:p-2 rounded-lg glass hover:bg-white/20 transition-colors flex-shrink-0"
            title="Logout"
          >
            <LogOut size={18} className="sm:w-5 sm:h-5" />
          </motion.button>
        </div>
      </div>
    </motion.nav>
  )
}

