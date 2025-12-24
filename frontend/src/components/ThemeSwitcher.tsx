import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme()

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleTheme}
      className="relative p-1.5 sm:p-2 rounded-lg glass hover:bg-white/20 transition-colors overflow-hidden flex-shrink-0"
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === 'dark' ? 0 : 360 }}
        transition={{ duration: 0.5 }}
      >
        {theme === 'dark' ? (
          <Moon className="text-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
        ) : (
          <Sun className="text-yellow-500 w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-blue-50/50 dark:bg-blue-500/20"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />
    </motion.button>
  )
}

