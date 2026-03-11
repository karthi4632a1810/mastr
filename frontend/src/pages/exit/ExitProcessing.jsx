import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { FileText, CheckCircle, XCircle, AlertCircle, Clock, User } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import { format } from 'date-fns'

const ExitProcessing = () => {
  const { isHR, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showReviewModal, setShowReviewModal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [reviewData, setReviewData] = useState({
    action: 'approve',
    comments: ''
  })

  const { data: resignations, isLoading } = useQuery({
    queryKey: ['exit-resignations', statusFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/resignations', { params })
      return response.data.data || []
    },
  })

  const approveMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/exit/resignations/${id}/approve`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['exit-resignations'])
      setShowReviewModal(null)
      setReviewData({ action: 'approve', comments: '' })
      showToast('Resignation approved successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to approve resignation', 'error')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/exit/resignations/${id}/reject`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['exit-resignations'])
      setShowReviewModal(null)
      setReviewData({ action: 'approve', comments: '' })
      showToast('Resignation rejected', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to reject resignation', 'error')
    },
  })

  const handleReview = async (resignation) => {
    try {
      const response = await api.get(`/exit/resignations/${resignation._id}/review`)
      setShowReviewModal({ ...resignation, reviewData: response.data.data })
      setReviewData({ action: 'approve', comments: '' })
    } catch (error) {
      showToast('Failed to load review data', 'error')
    }
  }

  const handleApprove = () => {
    if (!reviewData.comments) {
      showToast('Comments are required', 'error')
      return
    }
    approveMutation.mutate({
      id: showReviewModal._id,
      data: { comments: reviewData.comments }
    })
  }

  const handleReject = () => {
    if (!reviewData.comments) {
      showToast('Comments are required', 'error')
      return
    }
    rejectMutation.mutate({
      id: showReviewModal._id,
      data: { comments: reviewData.comments }
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Exit Processing</h1>
          <p className="text-gray-600 mt-1">Review and process employee resignations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <Select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'processing', label: 'Processing' },
            { value: 'completed', label: 'Completed' }
          ]}
        />
      </div>

      {/* Resignations List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : resignations && resignations.length > 0 ? (
          <div className="space-y-4">
            {resignations.map((resignation) => (
              <div key={resignation._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {resignation.employee?.firstName} {resignation.employee?.lastName}
                      </h3>
                      {getStatusBadge(resignation.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">Employee ID:</span>
                        <p className="text-gray-900">{resignation.employee?.employeeId}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Resignation Date:</span>
                        <p className="text-gray-900">{format(new Date(resignation.resignationDate), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Last Working Day:</span>
                        <p className="text-gray-900">{format(new Date(resignation.lastWorkingDay), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Notice Period:</span>
                        <p className="text-gray-900">{resignation.noticePeriodDays || 0} days</p>
                      </div>
                    </div>

                    {resignation.reason && (
                      <div className="mt-3">
                        <span className="text-gray-500 text-sm">Reason:</span>
                        <p className="text-gray-900 mt-1">{resignation.reason}</p>
                      </div>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      Submitted: {format(new Date(resignation.createdAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>

                  {resignation.status === 'pending' && (
                    <div className="ml-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReview(resignation)}
                      >
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No resignations found</h3>
            <p className="mt-1 text-sm text-gray-500">No resignations to process</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <Modal
          isOpen={!!showReviewModal}
          title="Review Resignation"
          onClose={() => {
            setShowReviewModal(null)
            setReviewData({ action: 'approve', comments: '' })
          }}
        >
          <div className="space-y-4">
            {showReviewModal.reviewData && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">Employee Information</p>
                  <div className="text-sm text-blue-800">
                    <p>Name: {showReviewModal.employee?.firstName} {showReviewModal.employee?.lastName}</p>
                    <p>ID: {showReviewModal.employee?.employeeId}</p>
                  </div>
                </div>

                {showReviewModal.reviewData.leaveBalance && (
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-yellow-900 mb-2">Leave Balance</p>
                    <p className="text-sm text-yellow-800">
                      {showReviewModal.reviewData.leaveBalance.total || 0} days remaining
                    </p>
                  </div>
                )}

                {showReviewModal.reviewData.assets && showReviewModal.reviewData.assets.length > 0 && (
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-orange-900 mb-2">Assigned Assets</p>
                    <div className="text-sm text-orange-800">
                      {showReviewModal.reviewData.assets.map((asset, idx) => (
                        <p key={idx}>• {asset.name}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments
              </label>
              <textarea
                className="input"
                required
                value={reviewData.comments}
                onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                rows={4}
                placeholder="Add your comments"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowReviewModal(null)
                  setReviewData({ action: 'approve', comments: '' })
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                isLoading={rejectMutation.isLoading}
              >
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                isLoading={approveMutation.isLoading}
              >
                Approve
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ExitProcessing

