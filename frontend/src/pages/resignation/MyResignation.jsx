import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { 
  Calendar, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  X, 
  Download,
  RotateCcw,
  ArrowRight
} from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'

const MyResignation = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawalReason, setWithdrawalReason] = useState('')

  const { data: resignation, isLoading } = useQuery({
    queryKey: ['myResignation'],
    queryFn: async () => {
      const response = await api.get('/resignations/me')
      return response.data.data
    },
    retry: false
  })

  const withdrawMutation = useMutation({
    mutationFn: async (reason) => {
      const response = await api.put('/resignations/me/withdraw', { reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myResignation'])
      showToast('Resignation withdrawn successfully', 'success')
      setShowWithdrawModal(false)
      setWithdrawalReason('')
      navigate('/resignation/submit')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to withdraw resignation', 'error')
    }
  })

  const handleWithdraw = () => {
    if (!withdrawalReason.trim()) {
      showToast('Please provide a reason for withdrawal', 'error')
      return
    }
    withdrawMutation.mutate(withdrawalReason)
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn',
      completed: 'Completed'
    }
    return labels[status] || status
  }

  const getReasonLabel = (reason) => {
    const reasons = {
      better_opportunity: 'Better Opportunity',
      personal_reasons: 'Personal Reasons',
      relocation: 'Relocation',
      health_issues: 'Health Issues',
      career_change: 'Career Change',
      dissatisfaction: 'Dissatisfaction',
      retirement: 'Retirement',
      other: 'Other'
    }
    return reasons[reason] || reason
  }

  const getStepStatus = (step) => {
    if (step.status === 'completed') return 'completed'
    if (step.status === 'in_progress') return 'in_progress'
    if (step.status === 'pending') return 'pending'
    return 'not_started'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!resignation) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Resignation Found</h2>
        <p className="text-gray-600 mb-4">You have not submitted a resignation yet.</p>
        <Button onClick={() => navigate('/resignation/submit')}>
          Submit Resignation
        </Button>
      </div>
    )
  }

  const exitSteps = resignation.exitSteps || {}
  const steps = [
    {
      key: 'resignation',
      label: 'Resignation',
      status: getStepStatus(exitSteps.resignation || { status: 'completed' }),
      completedAt: exitSteps.resignation?.completedAt
    },
    {
      key: 'approval',
      label: 'Approval',
      status: getStepStatus(exitSteps.approval || { status: 'pending' }),
      completedAt: exitSteps.approval?.completedAt
    },
    {
      key: 'clearance',
      label: 'Clearance',
      status: getStepStatus(exitSteps.clearance || { status: 'pending' }),
      completedAt: exitSteps.clearance?.completedAt
    },
    {
      key: 'finalSettlement',
      label: 'Final Settlement',
      status: getStepStatus(exitSteps.finalSettlement || { status: 'pending' }),
      completedAt: exitSteps.finalSettlement?.completedAt
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Resignation</h1>
        <p className="text-gray-600 mt-1">View your resignation status and exit process timeline</p>
      </div>

      {/* Status Card */}
      <div className="card mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Resignation Status</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(resignation.status)}`}>
              {getStatusLabel(resignation.status)}
            </span>
          </div>
          {resignation.status === 'pending' && (
            <Button
              variant="secondary"
              onClick={() => setShowWithdrawModal(true)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Withdraw Resignation
            </Button>
          )}
        </div>
      </div>

      {/* Exit Process Timeline */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Exit Process Timeline</h2>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={step.key} className="relative flex items-start space-x-4">
                {/* Step Icon */}
                <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                  step.status === 'completed' ? 'bg-green-500 text-white' :
                  step.status === 'in_progress' ? 'bg-primary-500 text-white' :
                  step.status === 'pending' ? 'bg-yellow-500 text-white' :
                  'bg-gray-300 text-gray-600'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : step.status === 'in_progress' ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <div className="w-3 h-3 rounded-full bg-current"></div>
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{step.label}</h3>
                      {step.completedAt && (
                        <p className="text-sm text-gray-500 mt-1">
                          Completed on {new Date(step.completedAt).toLocaleDateString()}
                        </p>
                      )}
                      {step.status === 'pending' && !step.completedAt && (
                        <p className="text-sm text-gray-500 mt-1">Awaiting completion</p>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resignation Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resignation Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Tentative Last Working Date</dt>
              <dd className="text-gray-900 font-medium">
                {new Date(resignation.tentativeLastWorkingDate).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Reason</dt>
              <dd className="text-gray-900">{getReasonLabel(resignation.reason)}</dd>
              {resignation.reasonText && (
                <dd className="text-sm text-gray-600 mt-1">{resignation.reasonText}</dd>
              )}
            </div>
            {resignation.additionalComments && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Additional Comments</dt>
                <dd className="text-gray-900 whitespace-pre-wrap">{resignation.additionalComments}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Submitted On</dt>
              <dd className="text-gray-900">
                {new Date(resignation.submittedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notice Period & Dates</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Notice Period</dt>
              <dd className="text-gray-900 font-medium">{resignation.noticePeriodDays} days</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Notice Period End Date</dt>
              <dd className="text-gray-900">
                {resignation.noticePeriodEndDate 
                  ? new Date(resignation.noticePeriodEndDate).toLocaleDateString()
                  : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Expected Relieving Date</dt>
              <dd className="text-gray-900 font-medium">
                {resignation.expectedRelievingDate 
                  ? new Date(resignation.expectedRelievingDate).toLocaleDateString()
                  : 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Minimum Service Period Met</dt>
              <dd className={resignation.minimumServicePeriodMet ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {resignation.minimumServicePeriodMet ? 'Yes ✓' : 'No ✗'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Supporting Documents */}
      {resignation.supportingDocuments && resignation.supportingDocuments.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Supporting Documents</h2>
          <div className="space-y-2">
            {resignation.supportingDocuments.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.originalName}</p>
                    <p className="text-xs text-gray-500">
                      Uploaded on {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <a
                  href={`${api.defaults.baseURL}${doc.path}`}
                  download
                  className="text-primary-600 hover:text-primary-800"
                >
                  <Download className="h-5 w-5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      <Modal
        isOpen={showWithdrawModal}
        onClose={() => {
          setShowWithdrawModal(false)
          setWithdrawalReason('')
        }}
        title="Withdraw Resignation"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to withdraw your resignation? This action will cancel your resignation request.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Withdrawal <span className="text-red-600">*</span>
            </label>
            <textarea
              value={withdrawalReason}
              onChange={(e) => setWithdrawalReason(e.target.value)}
              rows={3}
              className="input"
              placeholder="Provide a reason for withdrawing your resignation..."
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowWithdrawModal(false)
                setWithdrawalReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdraw}
              isLoading={withdrawMutation.isLoading}
              disabled={!withdrawalReason.trim()}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Withdraw Resignation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default MyResignation

