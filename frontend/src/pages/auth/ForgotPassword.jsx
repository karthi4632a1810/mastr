import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { Mail, ArrowLeft } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'

const ForgotPassword = () => {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(1) // 1: email, 2: OTP
  const [loading, setLoading] = useState(false)

  const handleSubmitEmail = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/auth/forgot-password', { email })
      if (response.data.success) {
        const receivedOtp = response.data.data?.otp
        if (receivedOtp) {
          showToast(`OTP: ${receivedOtp} (Development mode)`, 'info')
        } else {
          showToast('OTP has been sent. Please check your email.', 'success')
        }
        setStep(2)
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send OTP', 'error')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.post('/auth/verify-otp', { email, otp })
      if (response.data.success) {
        showToast('OTP verified successfully', 'success')
        navigate(`/reset-password?token=${response.data.data.resetToken}`)
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Invalid OTP', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-600 rounded-full flex items-center justify-center shadow-lg">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Forgot Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 1 ? 'Enter your email to receive OTP' : 'Enter the OTP sent to your email'}
          </p>
        </div>
        
        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmitEmail}>
            <Input
              label="Email address"
              id="email"
              name="email"
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div>
              <Button
                type="submit"
                disabled={loading}
                isLoading={loading}
                className="w-full"
              >
                Send OTP
              </Button>
            </div>
            <div className="text-center">
              <Link to="/login" className="text-sm text-primary-600 hover:text-primary-500 flex items-center justify-center">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to login
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
            <Input
              label="OTP"
              id="otp"
              name="otp"
              type="text"
              required
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />
            <div className="flex space-x-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                isLoading={loading}
                className="flex-1"
              >
                Verify OTP
              </Button>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  setOtp('')
                }}
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
