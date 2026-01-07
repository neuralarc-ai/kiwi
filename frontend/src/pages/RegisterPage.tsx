import { motion } from 'framer-motion'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function RegisterPage() {
  const navigate = useNavigate()
  
  useEffect(() => {
    // Redirect to login after 3 seconds
    const timer = setTimeout(() => {
        navigate('/login')
    }, 3000)
    return () => clearTimeout(timer)
  }, [navigate])


  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'var(--page-background)' }}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              repeatType: "reverse",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4 sm:px-6"
      >
        <Card variant="glass" className="p-6 sm:p-8 backdrop-blur-2xl">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="inline-block mb-4"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center">
                <Shield className="text-white" size={32} />
              </div>
            </motion.div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 gradient-text">Registration Disabled</h1>
            <p className="text-sm sm:text-base text-muted-foreground">User registration is restricted</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-lg p-4">
              <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
                <strong>Account creation is now restricted to administrators.</strong>
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300">
                To create an account, please contact your system administrator. They can add users through the Settings page.
              </p>
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="mr-2" size={20} />
              Go to Login
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            Already have an account?{' '}
            <Link to="/login" className="text-black dark:text-white hover:opacity-80 transition-colors">
              Sign In
            </Link>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}

