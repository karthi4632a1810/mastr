import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, GraduationCap, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import { format } from 'date-fns'

const TrainingRecords = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    employeeId: '',
    trainingProgramId: '',
    trainingDate: '',
    trainer: { name: '', credentials: '', organization: '' },
    location: '',
    attendance: { present: true, hoursAttended: 0, attendancePercentage: 100 },
    assessment: { score: null, passed: false }
  })

  const { data: programs } = useQuery({
    queryKey: ['training-programs'],
    queryFn: async () => {
      const response = await api.get('/training/programs')
      return response.data.data || []
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
    enabled: isHR || isAdmin
  })

  const { data: records, isLoading } = useQuery({
    queryKey: ['training-records', statusFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/training/records', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/training/records', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-records'])
      setShowCreateModal(false)
      showToast('Training record created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create training record', 'error')
    },
  })

  const getStatusBadge = (status) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    )
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.trainingProgramId || !formData.trainingDate) {
      showToast('Employee, training program, and date are required', 'error')
      return
    }
    createMutation.mutate(formData)
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Records</h1>
          <p className="text-gray-600 mt-1">View and manage training records</p>
        </div>
        {(isHR || isAdmin) && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Record
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
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'failed', label: 'Failed' },
            { value: 'expired', label: 'Expired' }
          ]}
        />
      </div>

      {/* Records List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : records && records.length > 0 ? (
          <div className="space-y-4">
            {records.map((record) => (
              <div key={record._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <GraduationCap className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {record.trainingProgram?.name}
                      </h3>
                      {getStatusBadge(record.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Employee:</span> {record.employee?.firstName} {record.employee?.lastName}
                    </p>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Training Date:</span> {format(new Date(record.trainingDate), 'MMM dd, yyyy')}
                    </p>

                    {record.assessment?.score !== null && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Assessment Score:</span> {record.assessment.score}%
                        {record.assessment.passed ? (
                          <CheckCircle className="inline h-4 w-4 text-green-600 ml-2" />
                        ) : (
                          <XCircle className="inline h-4 w-4 text-red-600 ml-2" />
                        )}
                      </p>
                    )}

                    {record.isExpired && (
                      <div className="mt-2 flex items-center text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Expired on {record.expiredAt ? format(new Date(record.expiredAt), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No training records found</h3>
          </div>
        )}
      </div>

      {/* Create Record Modal */}
      <Modal
        isOpen={showCreateModal}
        title="Create Training Record"
        onClose={() => setShowCreateModal(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {(isHR || isAdmin) && (
            <Select
              label="Employee"
              required
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              options={[
                { value: '', label: 'Select Employee' },
                ...(employees || []).map(emp => ({
                  value: emp._id,
                  label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
                }))
              ]}
            />
          )}

          <Select
            label="Training Program"
            required
            value={formData.trainingProgramId}
            onChange={(e) => setFormData({ ...formData, trainingProgramId: e.target.value })}
            options={[
              { value: '', label: 'Select Training Program' },
              ...(programs || []).map(prog => ({
                value: prog._id,
                label: `${prog.name} (${prog.code})`
              }))
            ]}
          />

          <DatePicker
            label="Training Date"
            required
            value={formData.trainingDate}
            onChange={(date) => setFormData({ ...formData, trainingDate: date })}
          />

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Training location"
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading}>
              Create Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TrainingRecords

