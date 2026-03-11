import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { format } from 'date-fns'

const ShiftChanges = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    date: '',
    currentShift: '',
    requestedShift: '',
    type: 'change',
    reason: ''
  })
  const [statusData, setStatusData] = useState({ status: 'pending', comments: '' })

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await api.get('/shifts', { params: { isActive: true } })
      return response.data.data || []
    },
  })

  const { data: shiftChanges, isLoading, error } = useQuery({
    queryKey: ['shift-changes', statusFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/shift-changes', { params })
      return response.data.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load shift change requests', 'error')
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/shift-changes', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shift-changes'])
      setShowCreateModal(false)
      setFormData({ date: '', currentShift: '', requestedShift: '', type: 'change', reason: '' })
      showToast('Shift change request submitted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit request', 'error')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/shift-changes/${id}/status`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shift-changes'])
      setShowStatusModal(null)
      setStatusData({ status: 'pending', comments: '' })
      showToast('Status updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update status', 'error')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.date || !formData.currentShift || !formData.reason) {
      showToast('Date, current shift, and reason are required', 'error')
      return
    }
    // Validate date is not in the past
    const selectedDate = new Date(formData.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      showToast('Cannot request shift change for past dates', 'error')
      return
    }
    if (formData.type === 'change' && !formData.requestedShift) {
      showToast('Requested shift is required for change type', 'error')
      return
    }
    if (formData.reason.trim().length < 10) {
      showToast('Please provide a detailed reason (at least 10 characters)', 'error')
      return
    }
    createMutation.mutate(formData)
  }

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
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
          <h1 className="text-3xl font-bold text-gray-900">
            {isHR || isAdmin ? 'Shift Change Requests' : 'My Shift Change Requests'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isHR || isAdmin 
              ? 'Review and manage shift change requests' 
              : 'Request changes to your shift schedule'}
          </p>
        </div>
        {!isHR && !isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Request Shift Change
          </Button>
        )}
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
            { value: 'rejected', label: 'Rejected' }
          ]}
        />
      </div>

      {/* Shift Changes List */}
      <div className="card">
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading shift change requests..." />
        ) : error ? (
          <EmptyState
            icon={Clock}
            title="Error loading requests"
            message={error.response?.data?.message || 'Failed to load shift change requests. Please try again.'}
          />
        ) : shiftChanges && shiftChanges.length > 0 ? (
          <div className="space-y-4">
            {shiftChanges.map((change) => (
              <div key={change._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {change.type === 'change' ? 'Shift Change' : 'Shift Swap'}
                      </h3>
                      {getStatusBadge(change.status)}
                    </div>
                    
                    {(isHR || isAdmin) && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Employee:</span> {change.employee?.firstName} {change.employee?.lastName}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Date:</span>
                        <p className="text-gray-900">{format(new Date(change.date), 'MMM dd, yyyy')}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Current Shift:</span>
                        <p className="text-gray-900">{change.currentShift?.name} ({change.currentShift?.startTime} - {change.currentShift?.endTime})</p>
                      </div>
                      {change.requestedShift && (
                        <div>
                          <span className="text-gray-500">Requested Shift:</span>
                          <p className="text-gray-900">{change.requestedShift?.name} ({change.requestedShift?.startTime} - {change.requestedShift?.endTime})</p>
                        </div>
                      )}
                      {change.swapWithEmployee && (
                        <div>
                          <span className="text-gray-500">Swap With:</span>
                          <p className="text-gray-900">{change.swapWithEmployee?.firstName} {change.swapWithEmployee?.lastName}</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <span className="text-gray-500 text-sm">Reason:</span>
                      <p className="text-gray-900 mt-1">{change.reason}</p>
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      Requested: {format(new Date(change.createdAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  </div>

                  {(isHR || isAdmin) && change.status === 'pending' && (
                    <div className="ml-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowStatusModal(change)
                          setStatusData({ status: 'approved', comments: '' })
                        }}
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
          <EmptyState
            icon={Clock}
            title="No shift change requests"
            message={isHR || isAdmin 
              ? 'No shift change requests found' 
              : 'You haven\'t submitted any shift change requests yet.'}
            actionLabel={!isHR && !isAdmin ? "Request Shift Change" : undefined}
            onAction={!isHR && !isAdmin ? () => setShowCreateModal(true) : undefined}
          />
        )}
      </div>

      {/* Create Request Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Request Shift Change"
        onClose={() => {
          setShowCreateModal(false)
          setFormData({ date: '', currentShift: '', requestedShift: '', type: 'change', reason: '' })
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Date"
            type="date"
            required
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          />

          <Select
            label="Request Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: 'change', label: 'Change Shift' },
              { value: 'swap', label: 'Swap Shift' }
            ]}
          />

          <Select
            label="Current Shift"
            required
            value={formData.currentShift}
            onChange={(e) => setFormData({ ...formData, currentShift: e.target.value })}
            options={[
              { value: '', label: 'Select current shift' },
              ...(shifts?.map(s => ({ value: s._id, label: `${s.name} (${s.startTime} - ${s.endTime})` })) || [])
            ]}
          />

          {formData.type === 'change' && (
            <Select
              label="Requested Shift"
              required
              value={formData.requestedShift}
              onChange={(e) => setFormData({ ...formData, requestedShift: e.target.value })}
              options={[
                { value: '', label: 'Select requested shift' },
                ...(shifts?.filter(s => s._id !== formData.currentShift).map(s => ({ 
                  value: s._id, 
                  label: `${s.name} (${s.startTime} - ${s.endTime})` 
                })) || [])
              ]}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              className="input"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={4}
              placeholder="Explain why you need this shift change"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                setFormData({ date: '', currentShift: '', requestedShift: '', type: 'change', reason: '' })
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

      {/* Update Status Modal */}
      {showStatusModal && (
        <Modal
          isOpen={!!showStatusModal}
          title="Review Shift Change Request"
          onClose={() => {
            setShowStatusModal(null)
            setStatusData({ status: 'approved', comments: '' })
          }}
        >
          <div className="space-y-4">
            <Select
              label="Status"
              required
              value={statusData.status}
              onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
              options={[
                { value: 'approved', label: 'Approve' },
                { value: 'rejected', label: 'Reject' }
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments
              </label>
              <textarea
                className="input"
                value={statusData.comments}
                onChange={(e) => setStatusData({ ...statusData, comments: e.target.value })}
                rows={3}
                placeholder="Add comments (optional)"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowStatusModal(null)
                  setStatusData({ status: 'approved', comments: '' })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => updateStatusMutation.mutate({
                  id: showStatusModal._id,
                  data: statusData
                })}
                isLoading={updateStatusMutation.isLoading}
                variant={statusData.status === 'rejected' ? 'danger' : 'primary'}
              >
                {statusData.status === 'approved' ? 'Approve' : 'Reject'} Request
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ShiftChanges

