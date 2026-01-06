import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface RoyalBrandTitleProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showSubtitle?: boolean
  variant?: 'navbar' | 'hero'
}

export default function RoyalBrandTitle({ 
  className = '', 
  size = 'lg',
  showSubtitle = true,
  variant = 'hero'
}: RoyalBrandTitleProps) {
  const [displayText, setDisplayText] = useState('')
  const fullText = 'KIWI'
  const [isTyping, setIsTyping] = useState(variant === 'hero')

  useEffect(() => {
    if (isTyping && variant === 'hero') {
      let currentIndex = 0
      const typingInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayText(fullText.slice(0, currentIndex + 1))
          currentIndex++
        } else {
          setIsTyping(false)
          clearInterval(typingInterval)
        }
      }, 150)

      return () => clearInterval(typingInterval)
    } else {
      setDisplayText(fullText)
    }
  }, [isTyping, variant, fullText])

  const sizeClasses = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl lg:text-6xl',
    xl: 'text-5xl md:text-6xl lg:text-7xl',
  }


  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className={`inline-flex ${variant === 'hero' ? 'flex-col' : 'flex-row'} items-center gap-2 md:gap-3 ${className}`}
    >
      {/* Text Container */}
      <div className="flex items-center gap-2 md:gap-3 relative">
        {/* KIWI Text with Simple Cursive and Typing Animation */}
        <motion.h1
          initial={{ opacity: 0, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, letterSpacing: '0.1em' }}
          transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          className={`${sizeClasses[size]} font-kiwi relative text-black dark:text-white`}
          style={{
            letterSpacing: '0.15em',
            fontFamily: "'Dancing Script', cursive",
          }}
        >
          {displayText}
          {isTyping && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="inline-block w-1 h-12 md:h-16 lg:h-20 ml-1 align-middle bg-black dark:bg-white"
            />
          )}
          
          {/* Gentle Glow Effect Behind Text */}
          <motion.span
            className="absolute inset-0 blur-2xl opacity-20 bg-black dark:bg-white"
            style={{
              filter: 'blur(20px)',
              zIndex: -1,
            }}
            animate={{
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.h1>
      </div>

      {/* Subtitle */}
      {showSubtitle && variant === 'hero' && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-xs md:text-sm font-light text-gray-400 tracking-widest uppercase whitespace-nowrap mt-2"
          style={{
            fontFamily: "'Inter', sans-serif",
          }}
        >
          HR Management System
        </motion.p>
      )}
    </motion.div>
  )
}
