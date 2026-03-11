import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, AlertCircle, CheckCircle, Clock, XCircle, Filter } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import { format } from 'date-fns'

const Grievances = () => {
  const { user, isHR, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    priority: 'medium'
  })
  const [statusData, setStatusData] = useState({
    status: 'open',
    resolution: ''
  })

  const { data: grievances, isLoading } = useQuery({
    queryKey: ['grievances', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (priorityFilter) params.priority = priorityFilter
      const response = await api.get('/grievances', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/grievances', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grievances'])
      setShowCreateModal(false)
      setFormData({ subject: '', description: '', category: '', priority: 'medium' })
      showToast('Grievance submitted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit grievance', 'error')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/grievances/${id}/status`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grievances'])
      setShowStatusModal(null)
      setStatusData({ status: 'open', resolution: '' })
      showToast('Grievance status updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update status', 'error')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.subject || !formData.description) {
      showToast('Subject and description are required', 'error')
      return
    }
    createMutation.mutate(formData)
  }

  const handleStatusUpdate = (grievanceId) => {
    if (statusData.status === 'resolved' && !statusData.resolution) {
      showToast('Resolution is required for resolved status', 'error')
      return
    }
    updateStatusMutation.mutate({
      id: grievanceId,
      data: statusData
    })
  }

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200',
      in_progress: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200',
      resolved: 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200',
      closed: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200'
    }
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200',
      medium: 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200',
      high: 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200',
      urgent: 'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
    }
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${styles[priority] || ''}`}>
        {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {isHR || isAdmin ? 'Grievance Management' : 'My Grievances'}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {isHR || isAdmin 
              ? 'Manage and resolve employee grievances' 
              : 'Submit and track your grievances'}
          </p>
        </div>
        {!isHR && !isAdmin && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Submit Grievance
          </Button>
        )}
      </div>

      {/* Enhanced Filters */}
      <div className="card mb-6 shadow-md hover:shadow-lg transition-shadow duration-200 border-t-4 border-t-primary-500">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <Filter className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' }
            ]}
          />
          <Select
            label="Filter by Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            options={[
              { value: '', label: 'All Priorities' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
        </div>
        {(statusFilter || priorityFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStatusFilter('')
                setPriorityFilter('')
              }}
              className="text-sm"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Enhanced Grievances List */}
      <div className="card shadow-md">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : grievances && grievances.length > 0 ? (
          <div className="space-y-4">
            {grievances.map((grievance) => (
              <div key={grievance._id} className="border-2 border-gray-200 rounded-lg p-5 hover:border-primary-300 hover:shadow-md transition-all duration-200 bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{grievance.subject}</h3>
                      {getStatusBadge(grievance.status)}
                      {getPriorityBadge(grievance.priority)}
                    </div>
                    
                    {isHR || isAdmin ? (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Employee:</span> {grievance.employee?.firstName} {grievance.employee?.lastName} ({grievance.employee?.employeeId})
                      </p>
                    ) : null}

                    {grievance.category && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-semibold">Category:</span> {grievance.category}
                      </p>
                    )}

                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">{grievance.description}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Submitted: {format(new Date(grievance.createdAt), 'MMM dd, yyyy')}
                      </span>
                      {grievance.resolvedAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Resolved: {format(new Date(grievance.resolvedAt), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>

                    {grievance.resolution && (
                      <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                        <p className="text-sm font-semibold text-green-800 mb-1">Resolution:</p>
                        <p className="text-sm text-green-700">{grievance.resolution}</p>
                      </div>
                    )}
                  </div>

                  {(isHR || isAdmin) && grievance.status !== 'resolved' && grievance.status !== 'closed' && (
                    <div className="ml-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowStatusModal(grievance)
                          setStatusData({ status: grievance.status, resolution: '' })
                        }}
                        className="hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow"
                      >
                        Update Status
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
              <AlertCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mt-2 text-base font-semibold text-gray-900">No grievances found</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              {isHR || isAdmin 
                ? 'No grievances to display at the moment.' 
                : 'You haven\'t submitted any grievances yet. Click "Submit Grievance" to get started.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Grievance Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Submit Grievance"
        onClose={() => {
          setShowCreateModal(false)
          setFormData({ subject: '', description: '', category: '', priority: 'medium' })
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject"
            required
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="Brief subject of your grievance"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              placeholder="Describe your grievance in detail"
            />
          </div>

          <Input
            label="Category (Optional)"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., HR, Payroll, Work Environment"
          />

          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                setFormData({ subject: '', description: '', category: '', priority: 'medium' })
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading}>
              Submit Grievance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Update Status Modal */}
      {showStatusModal && (
        <Modal
          isOpen={!!showStatusModal}
          title="Update Grievance Status"
          onClose={() => {
            setShowStatusModal(null)
            setStatusData({ status: 'open', resolution: '' })
          }}
        >
          <div className="space-y-4">
            <Select
              label="Status"
              required
              value={statusData.status}
              onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
              options={[
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' }
              ]}
            />

            {statusData.status === 'resolved' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution
                </label>
                <textarea
                  className="input"
                  required
                  value={statusData.resolution}
                  onChange={(e) => setStatusData({ ...statusData, resolution: e.target.value })}
                  rows={4}
                  placeholder="Describe how the grievance was resolved"
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowStatusModal(null)
                  setStatusData({ status: 'open', resolution: '' })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleStatusUpdate(showStatusModal._id)}
                isLoading={updateStatusMutation.isLoading}
              >
                Update Status
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Grievances

