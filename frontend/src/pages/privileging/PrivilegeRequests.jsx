import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, FileText, CheckCircle, XCircle, Clock, AlertCircle, UserCheck } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const PrivilegeRequests = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(null)
  const [reviewType, setReviewType] = useState(null) // 'hod', 'committee', 'ms'
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    requestedPrivileges: [{
      privilegeCategory: '',
      justification: ''
    }],
    qualifications: [],
    experience: {
      totalYears: 0,
      relevantExperience: 0
    }
  })
  const [reviewData, setReviewData] = useState({
    decision: '',
    comments: ''
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['privilege-categories'],
    queryFn: async () => {
      const response = await api.get('/privileging/categories')
      return response.data.data || []
    },
  })

  const { data: committees } = useQuery({
    queryKey: ['privilege-committees'],
    queryFn: async () => {
      const response = await api.get('/privileging/committees')
      return response.data.data || []
    },
  })

  const { data: requests, isLoading } = useQuery({
    queryKey: ['privilege-requests', statusFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/privileging/requests', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/privileging/requests', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['privilege-requests'])
      setShowCreateModal(false)
      resetForm()
      showToast('Privilege request submitted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit request', 'error')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ id, type, data }) => {
      const endpoint = type === 'hod' 
        ? `/privileging/requests/${id}/hod-review`
        : type === 'committee'
        ? `/privileging/requests/${id}/committee-review`
        : `/privileging/requests/${id}/ms-review`
      return api.put(endpoint, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['privilege-requests'])
      setShowReviewModal(null)
      setReviewType(null)
      resetReviewData()
      showToast('Review submitted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit review', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      requestedPrivileges: [{
        privilegeCategory: '',
        justification: ''
      }],
      qualifications: [],
      experience: {
        totalYears: 0,
        relevantExperience: 0
      }
    })
  }

  const resetReviewData = () => {
    setReviewData({
      decision: '',
      comments: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const employee = employees?.find(emp => emp.userId === user._id)
    if (!employee) {
      showToast('Employee record not found', 'error')
      return
    }
    if (!formData.requestedPrivileges[0]?.privilegeCategory) {
      showToast('Please select at least one privilege', 'error')
      return
    }

    createMutation.mutate({
      employeeId: employee._id,
      ...formData
    })
  }

  const handleReview = () => {
    if (!reviewData.decision) {
      showToast('Please select a decision', 'error')
      return
    }
    if (reviewData.decision === 'rejected' && !reviewData.comments) {
      showToast('Comments are required for rejection', 'error')
      return
    }

    reviewMutation.mutate({
      id: showReviewModal._id,
      type: reviewType,
      data: reviewData
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      hod_approved: 'bg-green-100 text-green-800',
      committee_review: 'bg-purple-100 text-purple-800',
      medical_superintendent_approved: 'bg-green-100 text-green-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, ' ')}
      </span>
    )
  }

  const canReviewHod = (request) => {
    return (isHR || isAdmin) && (request.status === 'submitted' || request.status === 'under_review')
  }

  const canReviewCommittee = (request) => {
    return (isHR || isAdmin) && request.status === 'hod_approved'
  }

  const canReviewMS = (request) => {
    return isAdmin && request.status === 'committee_review'
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isHR || isAdmin ? 'Privilege Requests' : 'My Privilege Requests'}
          </h1>
          <p className="text-gray-600 mt-1">Submit and track privilege requests</p>
        </div>
        <Button onClick={() => {
          resetForm()
          setShowCreateModal(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Submit Request
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <Select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'under_review', label: 'Under Review' },
            { value: 'hod_approved', label: 'HOD Approved' },
            { value: 'committee_review', label: 'Committee Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' }
          ]}
        />
      </div>

      {/* Requests List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Privilege Request #{request._id.slice(-6).toUpperCase()}
                      </h3>
                      {getStatusBadge(request.status)}
                    </div>

                    {isHR || isAdmin ? (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Employee:</span> {request.employee?.firstName} {request.employee?.lastName}
                      </p>
                    ) : null}

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Application Date:</span> {format(new Date(request.applicationDate), 'MMM dd, yyyy')}
                    </p>

                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Requested Privileges:</p>
                      <div className="space-y-2">
                        {request.requestedPrivileges?.map((req, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded">
                            <p className="text-sm text-gray-900">
                              {req.privilegeCategory?.name || 'N/A'}
                            </p>
                            {req.justification && (
                              <p className="text-xs text-gray-600 mt-1">{req.justification}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {request.finalDecision?.decision && (
                      <div className={`mt-3 p-3 rounded-lg ${
                        request.finalDecision.decision === 'approved' 
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className="text-sm font-medium mb-1">
                          {request.finalDecision.decision === 'approved' ? '✅ Approved' : '❌ Rejected'}
                        </p>
                        {request.finalDecision.rejectionReason && (
                          <p className="text-sm text-red-700">{request.finalDecision.rejectionReason}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="ml-4 flex flex-col gap-2">
                    {(canReviewHod(request)) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowReviewModal(request)
                          setReviewType('hod')
                          resetReviewData()
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        HOD Review
                      </Button>
                    )}
                    {(canReviewCommittee(request)) && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowReviewModal(request)
                          setReviewType('committee')
                          resetReviewData()
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Committee Review
                      </Button>
                    )}
                    {(canReviewMS(request)) && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setShowReviewModal(request)
                          setReviewType('ms')
                          resetReviewData()
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        MS Review
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No privilege requests found</h3>
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Submit Privilege Request"
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-medium mb-3">Requested Privileges</h3>
            {formData.requestedPrivileges.map((req, index) => (
              <div key={index} className="mb-4 p-4 border rounded-lg">
                <Select
                  label={`Privilege ${index + 1}`}
                  required
                  value={req.privilegeCategory}
                  onChange={(e) => {
                    const updated = [...formData.requestedPrivileges]
                    updated[index].privilegeCategory = e.target.value
                    setFormData({ ...formData, requestedPrivileges: updated })
                  }}
                  options={[
                    { value: '', label: 'Select Privilege Category' },
                    ...(categories || []).map(cat => ({
                      value: cat._id,
                      label: `${cat.name} (${cat.code})`
                    }))
                  ]}
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Justification
                  </label>
                  <textarea
                    className="input"
                    value={req.justification}
                    onChange={(e) => {
                      const updated = [...formData.requestedPrivileges]
                      updated[index].justification = e.target.value
                      setFormData({ ...formData, requestedPrivileges: updated })
                    }}
                    rows={3}
                    placeholder="Provide justification for this privilege request"
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormData({
                  ...formData,
                  requestedPrivileges: [...formData.requestedPrivileges, {
                    privilegeCategory: '',
                    justification: ''
                  }]
                })
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Another Privilege
            </Button>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Modal */}
      {showReviewModal && reviewType && (
        <Modal
          isOpen={!!showReviewModal}
          title={
            reviewType === 'hod' ? 'HOD Review' :
            reviewType === 'committee' ? 'Committee Review' :
            'Medical Superintendent Review'
          }
          onClose={() => {
            setShowReviewModal(null)
            setReviewType(null)
            resetReviewData()
          }}
        >
          <div className="space-y-4">
            <Select
              label="Decision"
              required
              value={reviewData.decision}
              onChange={(e) => setReviewData({ ...reviewData, decision: e.target.value })}
              options={[
                { value: '', label: 'Select Decision' },
                { value: 'approved', label: 'Approve' },
                { value: 'rejected', label: 'Reject' },
                ...(reviewType === 'committee' ? [{ value: 'requires_more_info', label: 'Requires More Info' }] : [])
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments {reviewData.decision === 'rejected' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                className="input"
                required={reviewData.decision === 'rejected'}
                value={reviewData.comments}
                onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                rows={4}
                placeholder="Enter review comments"
              />
            </div>

            {reviewType === 'committee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Committee
                </label>
                <Select
                  value={reviewData.committeeId || ''}
                  onChange={(e) => setReviewData({ ...reviewData, committeeId: e.target.value })}
                  options={[
                    { value: '', label: 'Select Committee' },
                    ...(committees || []).map(com => ({
                      value: com._id,
                      label: com.name
                    }))
                  ]}
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowReviewModal(null)
                  setReviewType(null)
                  resetReviewData()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReview}
                isLoading={reviewMutation.isLoading}
              >
                Submit Review
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default PrivilegeRequests

