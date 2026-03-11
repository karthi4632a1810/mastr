import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Stethoscope, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import { format } from 'date-fns'

const CHECKUP_TYPES = [
  { value: 'pre_employment', label: 'Pre-Employment' },
  { value: 'annual', label: 'Annual' },
  { value: 'periodic', label: 'Periodic' },
  { value: 'post_illness', label: 'Post-Illness' },
  { value: 'return_to_work', label: 'Return to Work' },
  { value: 'special', label: 'Special' }
]

const FITNESS_STATUSES = [
  { value: 'fit', label: 'Fit' },
  { value: 'unfit', label: 'Unfit' },
  { value: 'fit_with_restrictions', label: 'Fit with Restrictions' },
  { value: 'pending', label: 'Pending' }
]

const HealthCheckups = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    employeeId: '',
    checkupDate: new Date().toISOString().split('T')[0],
    checkupType: 'annual',
    fitnessStatus: 'pending',
    status: 'scheduled',
    conductedBy: '',
    doctorName: '',
    findings: '',
    recommendations: ''
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
    enabled: isHR || isAdmin
  })

  const { data: checkups, isLoading } = useQuery({
    queryKey: ['health-checkups', statusFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/occupational-health/checkups', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/occupational-health/checkups', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['health-checkups'])
      setShowModal(false)
      resetForm()
      showToast('Health checkup record created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create record', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      employeeId: '',
      checkupDate: new Date().toISOString().split('T')[0],
      checkupType: 'annual',
      fitnessStatus: 'pending',
      status: 'scheduled',
      conductedBy: '',
      doctorName: '',
      findings: '',
      recommendations: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.checkupDate) {
      showToast('Employee and checkup date are required', 'error')
      return
    }
    createMutation.mutate(formData)
  }

  const getFitnessBadge = (status) => {
    const styles = {
      fit: 'bg-green-100 text-green-800',
      unfit: 'bg-red-100 text-red-800',
      fit_with_restrictions: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Checkups</h1>
          <p className="text-gray-600 mt-1">Track employee health checkup records</p>
        </div>
        {(isHR || isAdmin) && (
          <Button onClick={() => {
            resetForm()
            setShowModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Checkup
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
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]}
        />
      </div>

      {/* Checkups List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : checkups && checkups.length > 0 ? (
          <div className="space-y-4">
            {checkups.map((checkup) => (
              <div key={checkup._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Stethoscope className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {CHECKUP_TYPES.find(t => t.value === checkup.checkupType)?.label || checkup.checkupType}
                      </h3>
                      {getFitnessBadge(checkup.fitnessStatus)}
                    </div>

                    {isHR || isAdmin ? (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Employee:</span> {checkup.employee?.firstName} {checkup.employee?.lastName}
                      </p>
                    ) : null}

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Checkup Date:</span> {format(new Date(checkup.checkupDate), 'MMM dd, yyyy')}
                    </p>

                    {checkup.nextCheckupDueDate && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Next Due:</span> {format(new Date(checkup.nextCheckupDueDate), 'MMM dd, yyyy')}
                      </p>
                    )}

                    {checkup.findings && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-800 mb-1">Findings:</p>
                        <p className="text-sm text-gray-700">{checkup.findings}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Stethoscope className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No health checkup records found</h3>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        title="Add Health Checkup"
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
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

          <DatePicker
            label="Checkup Date"
            required
            value={formData.checkupDate}
            onChange={(date) => setFormData({ ...formData, checkupDate: date })}
          />

          <Select
            label="Checkup Type"
            required
            value={formData.checkupType}
            onChange={(e) => setFormData({ ...formData, checkupType: e.target.value })}
            options={CHECKUP_TYPES}
          />

          <Select
            label="Fitness Status"
            required
            value={formData.fitnessStatus}
            onChange={(e) => setFormData({ ...formData, fitnessStatus: e.target.value })}
            options={FITNESS_STATUSES}
          />

          <Input
            label="Conducted By (Optional)"
            value={formData.conductedBy}
            onChange={(e) => setFormData({ ...formData, conductedBy: e.target.value })}
            placeholder="Hospital/Clinic name"
          />

          <Input
            label="Doctor Name (Optional)"
            value={formData.doctorName}
            onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Findings (Optional)
            </label>
            <textarea
              className="input"
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              rows={3}
              placeholder="Medical findings"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recommendations (Optional)
            </label>
            <textarea
              className="input"
              value={formData.recommendations}
              onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
              rows={3}
              placeholder="Doctor recommendations"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading}>
              Add Checkup
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default HealthCheckups

