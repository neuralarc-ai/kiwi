import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { apiService } from '@/services/api'
import { useTheme } from '@/contexts/ThemeContext'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  })

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [token])

  useEffect(() => {
    // Check password strength
    setPasswordStrength({
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      number: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    })
  }, [newPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!passwordStrength.length || !passwordStrength.uppercase || 
        !passwordStrength.lowercase || !passwordStrength.number || !passwordStrength.special) {
      setError('Password does not meet requirements')
      return
    }

    setLoading(true)

    try {
      await apiService.resetPassword(token, newPassword)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'var(--page-background)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md px-4 sm:px-6"
        >
          <Card variant="glass" className="p-8 backdrop-blur-2xl text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Password Reset Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'var(--page-background)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md px-4 sm:px-6"
      >
        <Card variant="glass" className="p-6 sm:p-8 backdrop-blur-2xl">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block mb-4"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-white dark:bg-black p-1.5 flex items-center justify-center shadow-lg">
                <img
                  src={theme === 'dark' ? "/logo/logo1.png" : "/logo/logo.png"}
                  alt="KIWI Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Logo image failed to load')
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">Reset Password</h1>
            <p className="text-sm text-muted-foreground">Enter your new password</p>
          </motion.div>

          <motion.form
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input
                variant="glass"
                type="password"
                placeholder="Enter new password"
                className="w-full placeholder:opacity-50"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              {newPassword && (
                <div className="text-xs space-y-1 mt-2">
                  <div className={`flex items-center gap-2 ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.length ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.uppercase ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span>One uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.lowercase ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span>One lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.number ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.number ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span>One number</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.special ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordStrength.special ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span>One special character</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                variant="glass"
                type="password"
                placeholder="Confirm new password"
                className="w-full placeholder:opacity-50"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords do not match</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading || !token}>
              <Lock className="mr-2" size={20} />
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Login
              </button>
            </div>
          </motion.form>
        </Card>
      </motion.div>
    </div>
  )
}

