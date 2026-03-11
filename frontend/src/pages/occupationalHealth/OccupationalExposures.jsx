import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, AlertTriangle, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import { format } from 'date-fns'

const EXPOSURE_TYPES = [
  { value: 'needle_stick', label: 'Needle Stick Injury' },
  { value: 'blood_fluid', label: 'Blood/Body Fluid Exposure' },
  { value: 'chemical', label: 'Chemical Exposure' },
  { value: 'radiation', label: 'Radiation Exposure' },
  { value: 'biological', label: 'Biological Exposure' },
  { value: 'other', label: 'Other' }
]

const STATUS_OPTIONS = [
  { value: 'reported', label: 'Reported' },
  { value: 'under_investigation', label: 'Under Investigation' },
  { value: 'under_treatment', label: 'Under Treatment' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' }
]

const OccupationalExposures = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    employeeId: '',
    exposureType: '',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: '',
    location: '',
    incidentDescription: '',
    immediateAction: '',
    woundCleaned: false,
    sourcePatient: {
      hasSource: false,
      knownHivStatus: 'unknown',
      knownHepatitisStatus: 'unknown'
    }
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
    enabled: isHR || isAdmin
  })

  const { data: exposures, isLoading } = useQuery({
    queryKey: ['occupational-exposures', statusFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/occupational-health/exposures', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/occupational-health/exposures', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['occupational-exposures'])
      setShowModal(false)
      resetForm()
      showToast('Exposure record created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create record', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      employeeId: '',
      exposureType: '',
      incidentDate: new Date().toISOString().split('T')[0],
      incidentTime: '',
      location: '',
      incidentDescription: '',
      immediateAction: '',
      woundCleaned: false,
      sourcePatient: {
        hasSource: false,
        knownHivStatus: 'unknown',
        knownHepatitisStatus: 'unknown'
      }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.exposureType || !formData.incidentDescription) {
      showToast('Employee, exposure type, and description are required', 'error')
      return
    }
    createMutation.mutate(formData)
  }

  const getStatusBadge = (status) => {
    const styles = {
      reported: 'bg-yellow-100 text-yellow-800',
      under_investigation: 'bg-blue-100 text-blue-800',
      under_treatment: 'bg-orange-100 text-orange-800',
      monitoring: 'bg-purple-100 text-purple-800',
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
          <h1 className="text-3xl font-bold text-gray-900">Occupational Exposures</h1>
          <p className="text-gray-600 mt-1">Track and manage occupational exposure incidents</p>
        </div>
        <Button onClick={() => {
          resetForm()
          setShowModal(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Report Exposure
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
            ...STATUS_OPTIONS
          ]}
        />
      </div>

      {/* Exposures List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : exposures && exposures.length > 0 ? (
          <div className="space-y-4">
            {exposures.map((exposure) => (
              <div key={exposure._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {EXPOSURE_TYPES.find(t => t.value === exposure.exposureType)?.label || exposure.exposureType}
                      </h3>
                      {getStatusBadge(exposure.status)}
                    </div>

                    {isHR || isAdmin ? (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Employee:</span> {exposure.employee?.firstName} {exposure.employee?.lastName}
                      </p>
                    ) : null}

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Incident Date:</span> {format(new Date(exposure.incidentDate), 'MMM dd, yyyy')}
                    </p>

                    {exposure.location && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Location:</span> {exposure.location}
                      </p>
                    )}

                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-1">Incident Description:</p>
                      <p className="text-sm text-red-700">{exposure.incidentDescription}</p>
                    </div>

                    {exposure.immediateAction && (
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-1">Immediate Action:</p>
                        <p className="text-sm text-blue-700">{exposure.immediateAction}</p>
                      </div>
                    )}

                    {exposure.pep?.provided && (
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        PEP Provided
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No exposure records found</h3>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        title="Report Occupational Exposure"
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        size="large"
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
            label="Exposure Type"
            required
            value={formData.exposureType}
            onChange={(e) => setFormData({ ...formData, exposureType: e.target.value })}
            options={[
              { value: '', label: 'Select Exposure Type' },
              ...EXPOSURE_TYPES
            ]}
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
            placeholder="e.g., ICU, Operating Room"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Incident Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input"
              required
              value={formData.incidentDescription}
              onChange={(e) => setFormData({ ...formData, incidentDescription: e.target.value })}
              rows={4}
              placeholder="Describe the incident in detail"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Immediate Action Taken
            </label>
            <textarea
              className="input"
              value={formData.immediateAction}
              onChange={(e) => setFormData({ ...formData, immediateAction: e.target.value })}
              rows={3}
              placeholder="e.g., Wound cleaned with soap and water, reported to supervisor"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="woundCleaned"
              checked={formData.woundCleaned}
              onChange={(e) => setFormData({ ...formData, woundCleaned: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="woundCleaned" className="ml-2 block text-sm text-gray-900">
              Wound was cleaned immediately
            </label>
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
              Report Exposure
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default OccupationalExposures

