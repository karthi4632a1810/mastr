import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Check, X, Clock, FileText } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import { format } from 'date-fns'

const ChangeRequests = () => {
  const { isHR, isAdmin } = useAuth()
  const isHRorAdmin = isHR || isAdmin
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    field: '',
    newValue: '',
    comments: ''
  })
  const [nestedFormData, setNestedFormData] = useState({
    address: { street: '', city: '', state: '', zipCode: '', country: '' },
    emergencyContact: { name: '', relation: '', phone: '', address: '' },
    bankDetails: { accountNumber: '', bankName: '', ifscCode: '', branchName: '', accountHolderName: '' },
    statutoryDetails: { uan: '', esiNumber: '', pfNumber: '' }
  })
  const [reviewData, setReviewData] = useState({ action: 'approve', comments: '' })

  const { data: changeRequests, isLoading } = useQuery({
    queryKey: ['changeRequests', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? { status: statusFilter } : {}
      const response = await api.get('/employees/change-requests', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/employees/change-requests', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['changeRequests'])
      setShowCreateModal(false)
      setFormData({ field: '', newValue: '', comments: '' })
      setNestedFormData({
        address: { street: '', city: '', state: '', zipCode: '', country: '' },
        emergencyContact: { name: '', relation: '', phone: '', address: '' },
        bankDetails: { accountNumber: '', bankName: '', ifscCode: '', branchName: '', accountHolderName: '' },
        statutoryDetails: { uan: '', esiNumber: '', pfNumber: '' }
      })
      showToast('Change request submitted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit change request', 'error')
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, data }) => {
      return api.put(`/employees/change-requests/${requestId}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['changeRequests'])
      setShowReviewModal(null)
      setReviewData({ action: 'approve', comments: '' })
      showToast('Change request reviewed successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to review change request', 'error')
    },
  })

  const allowedFields = [
    { value: 'phone', label: 'Phone Number' },
    { value: 'alternatePhone', label: 'Alternate Phone' },
    { value: 'alternateEmail', label: 'Alternate Email' },
    { value: 'address', label: 'Address' },
    { value: 'emergencyContact', label: 'Emergency Contact' },
    { value: 'linkedInProfile', label: 'LinkedIn Profile' },
    { value: 'skypeId', label: 'Skype ID' },
    { value: 'panNumber', label: 'PAN Number' },
    { value: 'aadhaarNumber', label: 'Aadhaar Number' },
    { value: 'passportNumber', label: 'Passport Number' },
    { value: 'bankDetails', label: 'Bank Account Details' },
    { value: 'statutoryDetails', label: 'Statutory Details (UAN, ESI, PF)' },
  ]

  const handleFieldChange = (field) => {
    setFormData({ ...formData, field, newValue: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    let submitData = {
      field: formData.field,
      comments: formData.comments
    }

    const nestedFields = ['address', 'emergencyContact', 'bankDetails', 'statutoryDetails']
    
    if (nestedFields.includes(formData.field)) {
      submitData.newValue = nestedFormData[formData.field]
    } else {
      submitData.newValue = formData.newValue
    }

    if (!submitData.field) {
      showToast('Please select a field to update', 'error')
      return
    }

    if (nestedFields.includes(formData.field)) {
      // Validate nested fields
      const nested = nestedFormData[formData.field]
      if (Object.values(nested).every(v => !v)) {
        showToast('Please fill at least one field', 'error')
        return
      }
    } else if (!submitData.newValue) {
      showToast('Please provide a new value', 'error')
      return
    }

    createMutation.mutate(submitData)
  }

  const handleReview = (requestId) => {
    reviewMutation.mutate({
      requestId,
      data: {
        action: reviewData.action,
        comments: reviewData.comments
      }
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200',
      approved: 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200',
      rejected: 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
    }
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    )
  }

  const formatValue = (value) => {
    if (!value) return '-'
    if (typeof value === 'object') {
      return Object.entries(value)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') || '-'
    }
    return value
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {isHRorAdmin ? 'Change Requests' : 'My Change Requests'}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {isHRorAdmin 
              ? 'Review and manage employee change requests' 
              : 'Request updates to your personal information'}
          </p>
        </div>
        {!isHRorAdmin && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* Enhanced Filters */}
      <div className="card mb-6 shadow-md hover:shadow-lg transition-shadow duration-200 border-t-4 border-t-primary-500">
        <Select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' }
          ]}
        />
      </div>

      {/* Enhanced Change Requests List */}
      <div className="card shadow-md">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : changeRequests && changeRequests.length > 0 ? (
          <div className="space-y-4">
            {changeRequests.map((request) => (
              <div key={request?._id || Math.random()} className="border-2 border-gray-200 rounded-lg p-5 hover:border-primary-300 hover:shadow-md transition-all duration-200 bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request?.field ? (allowedFields.find(f => f.value === request.field)?.label || request.field) : 'Unknown Field'}
                      </h3>
                      {getStatusBadge(request?.status || 'pending')}
                    </div>
                    
                    {isHRorAdmin && request?.employeeName && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Employee:</span> {request.employeeName} ({request.employeeCode || 'N/A'})
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Current Value:</span>
                        <p className="text-gray-900 mt-1">{formatValue(request?.oldValue)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Requested Value:</span>
                        <p className="text-gray-900 mt-1">{formatValue(request?.newValue)}</p>
                      </div>
                    </div>

                    {request?.comments && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Comments:</span>
                        <p className="text-gray-900">{request.comments}</p>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500">
                      {request?.requestedAt && (
                        <>Requested: {format(new Date(request.requestedAt), 'MMM dd, yyyy HH:mm')}</>
                      )}
                      {request?.reviewedAt && (
                        <> | Reviewed: {format(new Date(request.reviewedAt), 'MMM dd, yyyy HH:mm')}</>
                      )}
                    </div>
                  </div>

                  {isHRorAdmin && request?.status === 'pending' && (
                    <div className="ml-4 flex space-x-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowReviewModal(request)}
                        className="hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow"
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
          <div className="text-center py-16">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-2 text-base font-semibold text-gray-900">No change requests</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              {isHRorAdmin 
                ? 'No change requests found at the moment.' 
                : 'You haven\'t submitted any change requests yet. Click "New Request" to get started.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Create Change Request"
        onClose={() => {
            setShowCreateModal(false)
            setFormData({ field: '', newValue: '', comments: '' })
            setNestedFormData({
              address: { street: '', city: '', state: '', zipCode: '', country: '' },
              emergencyContact: { name: '', relation: '', phone: '', address: '' },
              bankDetails: { accountNumber: '', bankName: '', ifscCode: '', branchName: '', accountHolderName: '' },
              statutoryDetails: { uan: '', esiNumber: '', pfNumber: '' }
            })
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Field to Update"
              required
              value={formData.field}
              onChange={(e) => handleFieldChange(e.target.value)}
              options={[
                { value: '', label: 'Select a field' },
                ...allowedFields
              ]}
            />

            {(formData.field === 'address' || formData.field === 'emergencyContact' || formData.field === 'bankDetails' || formData.field === 'statutoryDetails') ? (
              <div className="space-y-3">
                {formData.field === 'address' && (
                  <>
                    <Input
                      label="Street"
                      value={nestedFormData.address.street}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        address: { ...nestedFormData.address, street: e.target.value }
                      })}
                    />
                    <Input
                      label="City"
                      value={nestedFormData.address.city}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        address: { ...nestedFormData.address, city: e.target.value }
                      })}
                    />
                    <Input
                      label="State"
                      value={nestedFormData.address.state}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        address: { ...nestedFormData.address, state: e.target.value }
                      })}
                    />
                    <Input
                      label="Zip Code"
                      value={nestedFormData.address.zipCode}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        address: { ...nestedFormData.address, zipCode: e.target.value }
                      })}
                    />
                    <Input
                      label="Country"
                      value={nestedFormData.address.country}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        address: { ...nestedFormData.address, country: e.target.value }
                      })}
                    />
                  </>
                )}

                {formData.field === 'emergencyContact' && (
                  <>
                    <Input
                      label="Contact Name"
                      value={nestedFormData.emergencyContact.name}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        emergencyContact: { ...nestedFormData.emergencyContact, name: e.target.value }
                      })}
                    />
                    <Input
                      label="Relation"
                      value={nestedFormData.emergencyContact.relation}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        emergencyContact: { ...nestedFormData.emergencyContact, relation: e.target.value }
                      })}
                    />
                    <Input
                      label="Phone"
                      value={nestedFormData.emergencyContact.phone}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        emergencyContact: { ...nestedFormData.emergencyContact, phone: e.target.value }
                      })}
                    />
                    <Input
                      label="Address"
                      value={nestedFormData.emergencyContact.address}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        emergencyContact: { ...nestedFormData.emergencyContact, address: e.target.value }
                      })}
                    />
                  </>
                )}

                {formData.field === 'bankDetails' && (
                  <>
                    <Input
                      label="Account Number"
                      value={nestedFormData.bankDetails.accountNumber}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        bankDetails: { ...nestedFormData.bankDetails, accountNumber: e.target.value }
                      })}
                    />
                    <Input
                      label="Bank Name"
                      value={nestedFormData.bankDetails.bankName}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        bankDetails: { ...nestedFormData.bankDetails, bankName: e.target.value }
                      })}
                    />
                    <Input
                      label="IFSC Code"
                      value={nestedFormData.bankDetails.ifscCode}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        bankDetails: { ...nestedFormData.bankDetails, ifscCode: e.target.value.toUpperCase() }
                      })}
                      placeholder="ABCD0123456"
                      maxLength={11}
                    />
                    <Input
                      label="Branch Name"
                      value={nestedFormData.bankDetails.branchName}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        bankDetails: { ...nestedFormData.bankDetails, branchName: e.target.value }
                      })}
                    />
                    <Input
                      label="Account Holder Name"
                      value={nestedFormData.bankDetails.accountHolderName}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        bankDetails: { ...nestedFormData.bankDetails, accountHolderName: e.target.value }
                      })}
                    />
                  </>
                )}

                {formData.field === 'statutoryDetails' && (
                  <>
                    <Input
                      label="UAN (Universal Account Number)"
                      value={nestedFormData.statutoryDetails.uan}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        statutoryDetails: { ...nestedFormData.statutoryDetails, uan: e.target.value.replace(/\D/g, '').slice(0, 12) }
                      })}
                      placeholder="12 digit UAN"
                      maxLength={12}
                    />
                    <Input
                      label="ESI Number"
                      value={nestedFormData.statutoryDetails.esiNumber}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        statutoryDetails: { ...nestedFormData.statutoryDetails, esiNumber: e.target.value }
                      })}
                    />
                    <Input
                      label="PF Number"
                      value={nestedFormData.statutoryDetails.pfNumber}
                      onChange={(e) => setNestedFormData({
                        ...nestedFormData,
                        statutoryDetails: { ...nestedFormData.statutoryDetails, pfNumber: e.target.value }
                      })}
                    />
                  </>
                )}
              </div>
            ) : formData.field && (
              <Input
                label="New Value"
                required
                value={formData.newValue}
                onChange={(e) => {
                  let value = e.target.value
                  // Format PAN number (uppercase, max 10 chars)
                  if (formData.field === 'panNumber') {
                    value = value.toUpperCase().slice(0, 10)
                  }
                  // Format Aadhaar number (digits only, max 12)
                  else if (formData.field === 'aadhaarNumber') {
                    value = value.replace(/\D/g, '').slice(0, 12)
                  }
                  setFormData({ ...formData, newValue: value })
                }}
                type={
                  formData.field.includes('Email') ? 'email' : 
                  formData.field.includes('Phone') ? 'tel' : 
                  formData.field === 'panNumber' ? 'text' :
                  formData.field === 'aadhaarNumber' ? 'text' :
                  'text'
                }
                placeholder={
                  formData.field === 'panNumber' ? 'ABCDE1234F' :
                  formData.field === 'aadhaarNumber' ? '12 digit number' :
                  ''
                }
                maxLength={
                  formData.field === 'panNumber' ? 10 :
                  formData.field === 'aadhaarNumber' ? 12 :
                  undefined
                }
              />
            )}

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments (Optional)
              </label>
              <textarea
                className="input"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({ field: '', newValue: '', comments: '' })
                }}
                className="w-full sm:w-auto hover:bg-gray-100 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={createMutation.isLoading}
                className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200"
              >
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>

      {/* Review Modal */}
      {showReviewModal && (
        <Modal
          isOpen={!!showReviewModal}
          title="Review Change Request"
          onClose={() => {
            setShowReviewModal(null)
            setReviewData({ action: 'approve', comments: '' })
          }}
        >
          <div className="space-y-4">
            <div className="text-sm">
              <p className="text-gray-500 mb-2">Field: <span className="font-medium text-gray-900">
                {allowedFields.find(f => f.value === showReviewModal?.field)?.label || showReviewModal?.field || 'N/A'}
              </span></p>
              {isHRorAdmin && (
                <p className="text-gray-500 mb-2">Employee: <span className="font-medium text-gray-900">
                  {showReviewModal?.employeeName || 'N/A'} ({showReviewModal?.employeeCode || 'N/A'})
                </span></p>
              )}
            </div>

            <Select
              label="Action"
              required
              value={reviewData.action}
              onChange={(e) => setReviewData({ ...reviewData, action: e.target.value })}
              options={[
                { value: 'approve', label: 'Approve' },
                { value: 'reject', label: 'Reject' }
              ]}
            />

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments (Optional)
              </label>
              <textarea
                className="input"
                value={reviewData.comments}
                onChange={(e) => setReviewData({ ...reviewData, comments: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowReviewModal(null)
                  setReviewData({ action: 'approve', comments: '' })
                }}
                className="w-full sm:w-auto hover:bg-gray-100 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                onClick={() => showReviewModal?._id && handleReview(showReviewModal._id)}
                isLoading={reviewMutation.isLoading}
                variant={reviewData.action === 'reject' ? 'danger' : 'primary'}
                disabled={!showReviewModal?._id}
                className={`w-full sm:w-auto transition-all duration-200 ${
                  reviewData.action === 'reject' 
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                    : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800'
                } shadow-md hover:shadow-lg`}
              >
                {reviewData.action === 'approve' ? 'Approve' : 'Reject'} Request
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ChangeRequests

