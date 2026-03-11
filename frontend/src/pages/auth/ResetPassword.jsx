import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'

const ResetPassword = () => {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const validatePassword = (pwd) => {
    return pwd.length >= 6
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validatePassword(password)) {
      showToast('Password must be at least 6 characters long', 'error')
      return
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error')
      return
    }

    setLoading(true)
    try {
      const resetToken = searchParams.get('token')
      if (!resetToken) {
        showToast('Invalid reset token', 'error')
        setLoading(false)
        return
      }

      const response = await api.post('/auth/reset-password', {
        resetToken,
        newPassword: password,
      })
      if (response.data.success) {
        showToast('Password reset successfully. Redirecting to login...', 'success')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset password', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your new password</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="input pr-10"
                placeholder="Enter new password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {password && (
              <div className="mt-1 flex items-center text-xs">
                {validatePassword(password) ? (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Password meets requirements
                  </span>
                ) : (
                  <span className="text-red-600">Password must be at least 6 characters</span>
                )}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className="input pr-10"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
            )}
            {confirmPassword && password === confirmPassword && (
              <p className="mt-1 text-xs text-green-600 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Passwords match
              </p>
            )}
          </div>
          <div>
            <Button
              type="submit"
              disabled={loading || !validatePassword(password) || password !== confirmPassword}
              isLoading={loading}
              className="w-full"
            >
              Reset Password
            </Button>
          </div>
          <div className="text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:text-primary-500">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
