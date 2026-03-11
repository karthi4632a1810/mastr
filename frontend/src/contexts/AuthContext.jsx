// Note: This file exports both a hook (useAuth) and a component (AuthProvider)
// Fast Refresh will do a full reload for this file, which is expected behavior
import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext()

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Auth Provider Component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const response = await api.get('/auth/me')
        if (response.data.success) {
          setUser({
            ...response.data.data.user,
            employee: response.data.data.employee
          })
        }
      }
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()

    // Set up token refresh interval (refresh every 50 minutes if token expires in 1 hour)
    const refreshInterval = setInterval(async () => {
      const token = localStorage.getItem('token')
      const refreshToken = localStorage.getItem('refreshToken')
      
      if (token && refreshToken) {
        try {
          const response = await api.post('/auth/refresh-token', { refreshToken })
          if (response.data.success) {
            localStorage.setItem('token', response.data.data.token)
            localStorage.setItem('refreshToken', response.data.data.refreshToken)
          }
        } catch (error) {
          // If refresh fails, clear tokens and redirect
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          setUser(null)
          if (window.location.pathname !== '/login') {
            navigate('/login')
          }
        }
      }
    }, 50 * 60 * 1000) // 50 minutes

    // Cleanup interval on unmount
    return () => clearInterval(refreshInterval)
  }, [navigate])

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      if (response.data.success) {
        const { token, refreshToken, user } = response.data.data
        localStorage.setItem('token', token)
        localStorage.setItem('refreshToken', refreshToken)
        setUser({
          ...user,
          employee: user.employee
        })
        return { success: true }
      }
      return { success: false, message: 'Login failed' }
    } catch (error) {
      // Handle network errors specifically
      if (!error.response) {
        // Network error - server unreachable
        if (error.code === 'ERR_NETWORK' || error.code === 'ERR_FAILED') {
          return { 
            success: false, 
            message: 'Unable to connect to server. The server may be down or unreachable. Please check your internet connection and try again.' 
          }
        }
        // Timeout error
        if (error.code === 'ECONNABORTED') {
          return { 
            success: false, 
            message: 'Request timed out. The server is taking too long to respond. Please try again.' 
          }
        }
        return { 
          success: false, 
          message: error.message || 'Network error. Please check your connection and try again.' 
        }
      }
      // Handle HTTP errors
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please check your credentials.' 
      }
    }
  }

  const logout = async () => {
    try {
      // Call logout API to invalidate refresh token on server
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await api.post('/auth/logout')
        } catch (error) {
          // Continue with logout even if API call fails
          console.error('Logout API call failed:', error)
        }
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local storage and state
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      setUser(null)
      navigate('/login')
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isHR: user?.role === 'hr' || user?.role === 'admin',
    isEmployee: user?.role === 'employee'
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }
