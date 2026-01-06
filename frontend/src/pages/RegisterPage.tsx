import { motion } from 'framer-motion'
import { UserPlus, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { apiService } from '@/services/api'
import { useToast, ToastContainer } from '@/components/ui/toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter'
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter'
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number'
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.warning('Please fix the errors in the form')
      return
    }

    setLoading(true)
    try {
      console.log('🚀 Registering user:', { 
        email: formData.email,
        hasEmail: !!formData.email,
        hasPassword: !!formData.password,
        passwordLength: formData.password?.length
      })
      
      // Ensure we have valid data
      if (!formData.email || !formData.password) {
        toast.error('Please fill in all required fields')
        setLoading(false)
        return
      }
      
      const registrationData = {
        email: formData.email.trim(),
        password: formData.password,
      }
      
      console.log('📤 Sending registration data:', registrationData)
      
      const response = await apiService.register(registrationData)
      
      console.log('✅ Registration response:', response)
      
      toast.success(response?.message || 'Account created successfully!')
      
      // Clear form
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
      })
      
      // Navigate to login page after a short delay
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (error: any) {
      console.error('❌ Registration error:', error)
      
      let errorMessage = 'Failed to create account'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      // Check for password validation errors
      if (error?.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const passwordErrors = error.response.data.errors.join(', ')
        errorMessage = `Password validation failed: ${passwordErrors}`
      }
      
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        errorMessage = 'An account with this email already exists. Please use a different email or sign in.'
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

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
            onSubmit={handleSubmit}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input
                variant="glass"
                type="email"
                placeholder="you@company.com"
                className="w-full"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  if (errors.email) setErrors({ ...errors, email: '' })
                }}
                required
              />
              {errors.email && (
                <p className="text-xs text-red-500 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password *</label>
              <Input
                variant="glass"
                type="password"
                placeholder="••••••••"
                className="w-full"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value })
                  if (errors.password) setErrors({ ...errors, password: '' })
                }}
                required
                minLength={8}
              />
              {errors.password && (
                <p className="text-xs text-red-500 dark:text-red-400">{errors.password}</p>
              )}
              <div className="text-xs text-muted-foreground space-y-1 mt-1">
                <p className="font-medium">Password requirements:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li className={formData.password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One number
                  </li>
                  <li className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-600 dark:text-green-400' : ''}>
                    One special character
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password *</label>
              <Input
                variant="glass"
                type="password"
                placeholder="••••••••"
                className="w-full"
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value })
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                }}
                required
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 dark:text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            <Button 
              className="w-full" 
              size="lg" 
              type="submit"
              disabled={loading}
            >
              <UserPlus className="mr-2" size={20} />
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </motion.form>

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
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  )
}

