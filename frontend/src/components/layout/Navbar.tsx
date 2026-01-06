import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

import { useSidebar } from '@/contexts/SidebarContext'
import { Menu } from 'lucide-react'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isMobile, openMobileSidebar } = useSidebar()

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 overflow-x-hidden max-w-full"
      style={{ position: 'sticky', backgroundColor: 'transparent' }}
    >
      <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-2 sm:py-3 overflow-x-hidden max-w-full w-full min-w-0">
        {/* Left side - Mobile menu button */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 min-w-0">
          {/* Mobile menu button - Always show on mobile */}
          {isMobile && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openMobileSidebar()
              }}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition-colors flex-shrink-0 z-50 relative"
              aria-label="Open menu"
              style={{ zIndex: 50 }}
            >
              <Menu size={20} className="sm:w-6 sm:h-6 text-gray-700 dark:text-gray-300" />
            </button>
          )}
        </div>

        {/* Right side - Profile Icon */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 min-w-0">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard/profile')}
            className="p-1.5 sm:p-2 rounded-full cursor-pointer relative group hover:bg-white/10 dark:hover:bg-white/5 transition-colors flex-shrink-0"
            title={user?.email || 'User'}
          >
            <User size={18} className="sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
          </motion.div>
        </div>
      </div>
    </motion.nav>
  )
}

