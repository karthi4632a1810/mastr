import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { 
  ArrowLeft, 
  CheckCircle, 
  X, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Package, 
  FileText,
  AlertCircle,
  History
} from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'

const ResignationReview = () => {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showClarificationModal, setShowClarificationModal] = useState(false)
  const [comments, setComments] = useState('')

  const { data: reviewData, isLoading } = useQuery({
    queryKey: ['resignationReview', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Resignation ID is required')
      }
      const response = await api.get(`/exit/resignations/${id}/review`)
      return response.data.data
    },
    enabled: !!id // Only run the query if id exists
  })

  const approveMutation = useMutation({
    mutationFn: async (comments) => {
      const response = await api.put(`/exit/resignations/${id}/approve`, { comments })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resignationReview', id])
      queryClient.invalidateQueries(['resignations'])
      showToast('Resignation approved successfully', 'success')
      setShowApproveModal(false)
      setComments('')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to approve resignation', 'error')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async (comments) => {
      const response = await api.put(`/exit/resignations/${id}/reject`, { comments })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resignationReview', id])
      queryClient.invalidateQueries(['resignations'])
      showToast('Resignation rejected', 'success')
      setShowRejectModal(false)
      setComments('')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to reject resignation', 'error')
    }
  })

  const clarificationMutation = useMutation({
    mutationFn: async (clarificationRequest) => {
      const response = await api.put(`/exit/resignations/${id}/request-clarification`, { clarificationRequest })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['resignationReview', id])
      queryClient.invalidateQueries(['resignations'])
      showToast('Clarification requested', 'success')
      setShowClarificationModal(false)
      setComments('')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to request clarification', 'error')
    }
  })

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

  if (!id) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600 text-lg mb-2">Resignation ID is missing</p>
        <p className="text-gray-500 mb-4">Please select a resignation to review.</p>
        <Link to="/exit/processing" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Go to Exit Processing
        </Link>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!reviewData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Resignation not found</p>
        <Link to="/exit/processing" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Exit Processing
        </Link>
      </div>
    )
  }

  const { resignation, employee, leaveBalance, assets, previousResignations, noticePeriodServed, noticePeriodRemaining } = reviewData
  const canProcess = resignation.status === 'pending' || resignation.status === 'clarification_requested'

  return (
    <div>
      {/* Professional Header Banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-6 py-8 mb-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/resignations">
              <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {employee?.firstName} {employee?.lastName}
              </h1>
              <p className="text-primary-100">Resignation Review</p>
              <p className="text-primary-200 text-sm font-mono mt-1">Employee ID: {employee?.employeeId}</p>
            </div>
          </div>
          {canProcess && (
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowClarificationModal(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Request Clarification
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowRejectModal(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => setShowApproveModal(true)}
                className="bg-white text-primary-700 hover:bg-primary-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(resignation.status)}`}>
              {resignation.status.charAt(0).toUpperCase() + resignation.status.slice(1)}
            </span>
            {resignation.clarificationRequested && (
              <span className="ml-3 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Clarification Requested
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Submitted: {new Date(resignation.submittedAt).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Details */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Employee Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
                <dd className="text-gray-900">{employee?.employeeId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Department</dt>
                <dd className="text-gray-900">{employee?.department?.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Designation</dt>
                <dd className="text-gray-900">{employee?.designation?.name || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Reporting Manager</dt>
                <dd className="text-gray-900">
                  {employee?.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Joining Date</dt>
                <dd className="text-gray-900">
                  {employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Work Location</dt>
                <dd className="text-gray-900">{employee?.workLocation || '-'}</dd>
              </div>
            </dl>
          </div>

          {/* Resignation Details */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Resignation Details</h2>
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
              {resignation.clarificationRequest && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <dt className="text-sm font-medium text-yellow-800 mb-1">Clarification Requested</dt>
                  <dd className="text-sm text-yellow-700">{resignation.clarificationRequest}</dd>
                  {resignation.clarificationResponse && (
                    <>
                      <dt className="text-sm font-medium text-yellow-800 mt-3 mb-1">Employee Response</dt>
                      <dd className="text-sm text-yellow-700">{resignation.clarificationResponse}</dd>
                    </>
                  )}
                </div>
              )}
            </dl>
          </div>

          {/* Notice Period Calculation */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Notice Period</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Required Notice Period</dt>
                <dd className="text-gray-900 font-medium">{resignation.noticePeriodDays} days</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Notice Period Served</dt>
                <dd className="text-gray-900 font-medium">{noticePeriodServed} days</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Notice Period Remaining</dt>
                <dd className="text-gray-900 font-medium">{noticePeriodRemaining} days</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Notice Period End Date</dt>
                <dd className="text-gray-900">
                  {resignation.noticePeriodEndDate 
                    ? new Date(resignation.noticePeriodEndDate).toLocaleDateString()
                    : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Leave Balance */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Leave Balance</h2>
            {leaveBalance && leaveBalance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leaveBalance.map((balance, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {balance.leaveType.name}
                          {balance.leaveType.isPaid && (
                            <span className="ml-2 text-xs text-gray-500">(Paid)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{balance.total}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{balance.used}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{balance.pending}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{balance.available}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No leave balance information available</p>
            )}
          </div>

          {/* Asset Assignments */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Asset Assignments</h2>
            {assets && assets.length > 0 ? (
              <div className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{asset.name || asset.assetId}</div>
                      <div className="text-sm text-gray-500">
                        {asset.category?.name || 'N/A'} • {asset.location?.name || 'N/A'}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                      {asset.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No assets assigned</p>
            )}
          </div>

          {/* Previous Resignations */}
          {previousResignations && previousResignations.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Previous Resignations</h2>
              <div className="space-y-3">
                {previousResignations.map((prev) => (
                  <div key={prev._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">
                          {new Date(prev.submittedAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          TLWD: {new Date(prev.tentativeLastWorkingDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(prev.status)}`}>
                        {prev.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Log */}
          {resignation.auditLog && resignation.auditLog.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Audit Log</h2>
              <div className="space-y-3">
                {resignation.auditLog.map((log, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-medium text-gray-900">{log.action.replace('_', ' ')}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.performedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      By: {log.performedBy?.email || 'System'}
                    </div>
                    {log.comments && (
                      <div className="text-sm text-gray-700 mt-1">{log.comments}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          {canProcess && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Quick Actions</h2>
              <div className="space-y-3">
                <Button
                  onClick={() => setShowApproveModal(true)}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Resignation
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowRejectModal(true)}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Resignation
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowClarificationModal(true)}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Request Clarification
                </Button>
              </div>
            </div>
          )}

          {/* Exit Checklist Link */}
          {resignation.status === 'approved' && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Exit Checklist</h2>
              <p className="text-sm text-gray-600 mb-4">
                Exit checklist has been generated. Manage checklist items to complete the exit process.
              </p>
              <Link to={`/exit/checklist/${resignation._id}`}>
                <Button variant="secondary" className="w-full">
                  View Exit Checklist
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false)
          setComments('')
        }}
        title="Approve Resignation"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Approving this resignation will generate an exit checklist and notify relevant departments.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              className="input"
              placeholder="Add any comments..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowApproveModal(false)
                setComments('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate(comments)}
              isLoading={approveMutation.isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setComments('')
        }}
        title="Reject Resignation"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Please provide a mandatory reason for rejecting this resignation.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-600">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="input"
              placeholder="Provide reason for rejection..."
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false)
                setComments('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => rejectMutation.mutate(comments)}
              isLoading={rejectMutation.isLoading}
              disabled={!comments.trim()}
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clarification Modal */}
      <Modal
        isOpen={showClarificationModal}
        onClose={() => {
          setShowClarificationModal(false)
          setComments('')
        }}
        title="Request Clarification"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Request additional information or clarification from the employee.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clarification Request <span className="text-red-600">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="input"
              placeholder="What information do you need from the employee?"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowClarificationModal(false)
                setComments('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => clarificationMutation.mutate(comments)}
              isLoading={clarificationMutation.isLoading}
              disabled={!comments.trim()}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Request Clarification
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ResignationReview

