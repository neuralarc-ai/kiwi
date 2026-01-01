import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService, LoginResponse } from '@/services/api'

interface AuthContextType {
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (data: { email: string; password: string; role: string; first_name?: string; last_name?: string; phone?: string; department?: string; position?: string; address?: string }) => Promise<boolean>
  user: { id: number; email: string; role: string } | null
  token: string | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage synchronously to avoid flash
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token')
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token')
  })
  const [user, setUser] = useState<{ id: number; email: string; role: string } | null>(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        return JSON.parse(storedUser)
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        return null
      }
    }
    return null
  })
  const [loading, setLoading] = useState(false) // Only true during async operations

  // Verify auth state on mount (in case localStorage was cleared externally)
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        setToken(storedToken)
        setUser(parsedUser)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setIsAuthenticated(false)
        setToken(null)
        setUser(null)
      }
    } else if (!storedToken) {
      // Clear state if no token
      setIsAuthenticated(false)
      setToken(null)
      setUser(null)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response: LoginResponse = await apiService.login(email, password)
      
      if (response.token && response.user) {
        setToken(response.token)
        setUser(response.user)
        setIsAuthenticated(true)
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        return true
      }
      return false
    } catch (error: any) {
      console.error('Login error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const register = async (data: { email: string; password: string; role: string; first_name?: string; last_name?: string; phone?: string; department?: string; position?: string; address?: string }): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await apiService.register(data)
      
      if (response.token && response.user) {
        setToken(response.token)
        setUser(response.user)
        setIsAuthenticated(true)
        localStorage.setItem('token', response.token)
        localStorage.setItem('user', JSON.stringify(response.user))
        return true
      }
      return false
    } catch (error: any) {
      console.error('Register error:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('isAuthenticated')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, register, user, token, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Protected Route Component
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, token } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Wait for initial auth check to complete before redirecting
    if (!loading) {
      // Check both isAuthenticated and token for extra safety
      if (!isAuthenticated || !token) {
        navigate('/login', { replace: true })
      }
    }
  }, [isAuthenticated, loading, token, navigate])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated || !token) {
    return null
  }

  return <>{children}</>
}
