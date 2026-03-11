import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, AlertCircle, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import { format } from 'date-fns'

const INCIDENT_TYPES = [
  { value: 'needle_stick', label: 'Needle Stick' },
  { value: 'fall', label: 'Fall' },
  { value: 'chemical_spill', label: 'Chemical Spill' },
  { value: 'fire', label: 'Fire' },
  { value: 'equipment_failure', label: 'Equipment Failure' },
  { value: 'patient_safety', label: 'Patient Safety' },
  { value: 'workplace_violence', label: 'Workplace Violence' },
  { value: 'ergonomic', label: 'Ergonomic' },
  { value: 'other', label: 'Other' }
]

const SEVERITY_OPTIONS = [
  { value: 'minor', label: 'Minor' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'major', label: 'Major' },
  { value: 'critical', label: 'Critical' }
]

const IncidentReports = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    employeeId: null,
    incidentType: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: '',
    location: '',
    description: '',
    severity: 'moderate',
    immediateActions: ''
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
    enabled: isHR || isAdmin
  })

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incident-reports', severityFilter, statusFilter],
    queryFn: async () => {
      const params = {}
      if (severityFilter) params.severity = severityFilter
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/occupational-health/incidents', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/occupational-health/incidents', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['incident-reports'])
      setShowModal(false)
      resetForm()
      showToast('Incident report created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create incident report', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      employeeId: null,
      incidentType: '',
      incidentDate: new Date().toISOString().split('T')[0],
      incidentTime: '',
      location: '',
      description: '',
      severity: 'moderate',
      immediateActions: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.incidentType || !formData.location || !formData.description) {
      showToast('Incident type, location, and description are required', 'error')
      return
    }
    createMutation.mutate(formData)
  }

  const getSeverityBadge = (severity) => {
    const styles = {
      minor: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      major: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[severity] || ''}`}>
        {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
      </span>
    )
  }

  const getStatusBadge = (status) => {
    const styles = {
      reported: 'bg-yellow-100 text-yellow-800',
      under_investigation: 'bg-blue-100 text-blue-800',
      capa_in_progress: 'bg-purple-100 text-purple-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace(/_/g, ' ')}
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Incident Reports</h1>
          <p className="text-gray-600 mt-1">Track and manage workplace incidents</p>
        </div>
        <Button onClick={() => {
          resetForm()
          setShowModal(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Report Incident
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Filter by Severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            options={[
              { value: '', label: 'All Severities' },
              ...SEVERITY_OPTIONS
            ]}
          />
          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'reported', label: 'Reported' },
              { value: 'under_investigation', label: 'Under Investigation' },
              { value: 'capa_in_progress', label: 'CAPA In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' }
            ]}
          />
        </div>
      </div>

      {/* Incidents List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : incidents && incidents.length > 0 ? (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {INCIDENT_TYPES.find(t => t.value === incident.incidentType)?.label || incident.incidentType}
                      </h3>
                      {getSeverityBadge(incident.severity)}
                      {getStatusBadge(incident.status)}
                    </div>

                    {incident.employee && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Employee:</span> {incident.employee?.firstName} {incident.employee?.lastName}
                      </p>
                    )}

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Date:</span> {format(new Date(incident.incidentDate), 'MMM dd, yyyy')}
                    </p>

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Location:</span> {incident.location}
                    </p>

                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-1">Description:</p>
                      <p className="text-sm text-red-700">{incident.description}</p>
                    </div>

                    {incident.immediateActions && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-1">Immediate Actions:</p>
                        <p className="text-sm text-blue-700">{incident.immediateActions}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No incident reports found</h3>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        title="Report Incident"
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {(isHR || isAdmin) && (
            <Select
              label="Employee (Optional)"
              value={formData.employeeId || ''}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value || null })}
              options={[
                { value: '', label: 'Not Applicable / General Incident' },
                ...(employees || []).map(emp => ({
                  value: emp._id,
                  label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
                }))
              ]}
            />
          )}

          <Select
            label="Incident Type"
            required
            value={formData.incidentType}
            onChange={(e) => setFormData({ ...formData, incidentType: e.target.value })}
            options={[
              { value: '', label: 'Select Incident Type' },
              ...INCIDENT_TYPES
            ]}
          />

          <Select
            label="Severity"
            required
            value={formData.severity}
            onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
            options={SEVERITY_OPTIONS}
          />

          <DatePicker
            label="Incident Date"
            required
            value={formData.incidentDate}
            onChange={(date) => setFormData({ ...formData, incidentDate: date })}
          />

          <Input
            label="Incident Time (Optional)"
            type="time"
            value={formData.incidentTime}
            onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
          />

          <Input
            label="Location"
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., ICU, Ward 5, Emergency Department"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Describe the incident in detail"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Immediate Actions Taken
            </label>
            <textarea
              className="input"
              value={formData.immediateActions}
              onChange={(e) => setFormData({ ...formData, immediateActions: e.target.value })}
              rows={3}
              placeholder="Actions taken immediately after the incident"
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
              Report Incident
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default IncidentReports

