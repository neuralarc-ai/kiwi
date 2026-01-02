import { motion } from 'framer-motion'
import { UserPlus, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'

export default function RegisterPage() {
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
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                <Sparkles className="text-white" size={32} />
              </div>
            </motion.div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 gradient-text">KIWI</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Create your account to get started</p>
          </motion.div>

          <motion.form
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                variant="glass"
                type="text"
                placeholder="John Doe"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                variant="glass"
                type="email"
                placeholder="you@company.com"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                variant="glass"
                type="password"
                placeholder="••••••••"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                variant="glass"
                type="password"
                placeholder="••••••••"
                className="w-full"
              />
            </div>

            <div className="flex items-start gap-2 text-xs sm:text-sm">
              <input type="checkbox" className="rounded mt-1 flex-shrink-0" />
              <span className="text-muted-foreground break-words">
                I agree to the{' '}
                <a href="#" className="text-black dark:text-white transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-black dark:text-white transition-colors">
                  Privacy Policy
                </a>
              </span>
            </div>

            <Button className="w-full" size="lg">
              <UserPlus className="mr-2" size={20} />
              Create Account
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center text-sm text-muted-foreground"
          >
            Already have an account?{' '}
            <Link to="/login" className="text-black dark:text-white transition-colors">
              Sign In
            </Link>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  )
}

