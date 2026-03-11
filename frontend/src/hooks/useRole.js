import { useAuth } from '../contexts/AuthContext'

/**
 * Custom hook for role-based access control
 * @returns {Object} Role checking functions
 */
export const useRole = () => {
  const { user, isAdmin, isHR, isEmployee } = useAuth()

  const hasRole = (roles) => {
    if (!user || !roles || roles.length === 0) return false
    return roles.includes(user.role)
  }

  const canAccess = (requiredRole) => {
    if (!user) return false
    
    switch (requiredRole) {
      case 'admin':
        return isAdmin
      case 'hr':
        return isHR
      case 'employee':
        return isEmployee
      default:
        return false
    }
  }

  return {
    hasRole,
    canAccess,
    isAdmin,
    isHR,
    isEmployee,
    userRole: user?.role
  }
}

export default useRole

