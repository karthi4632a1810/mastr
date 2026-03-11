import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { useEffect, useRef } from 'react'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth()
  let showToast
  try {
    const toast = useToast()
    showToast = toast.showToast
  } catch {
    showToast = () => {} // Fallback if ToastContext is not available
  }

  // Use ref to track if we've already shown toast to prevent infinite loops
  const hasShownToast = useRef({ login: false, permission: false })

  useEffect(() => {
    // Reset toast flags when auth state changes
    if (loading) {
      hasShownToast.current = { login: false, permission: false }
      return
    }

    if (!isAuthenticated || !user) {
      if (!hasShownToast.current.login) {
        showToast('Please login to access this page', 'error')
        hasShownToast.current.login = true
      }
    } else if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
      if (!hasShownToast.current.permission) {
        showToast('You do not have permission to access this page', 'error')
        hasShownToast.current.permission = true
      }
    } else {
      // Reset flags when user is authenticated and has permission
      hasShownToast.current = { login: false, permission: false }
    }
  }, [loading, isAuthenticated, user, allowedRoles, showToast])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
