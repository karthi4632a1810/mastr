import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Heart, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import { format } from 'date-fns'

const VACCINE_TYPES = [
  { value: 'hbv', label: 'Hepatitis B (HBV)' },
  { value: 'tt', label: 'Tetanus Toxoid (TT)' },
  { value: 'covid', label: 'COVID-19' },
  { value: 'influenza', label: 'Influenza' },
  { value: 'mmr', label: 'MMR' },
  { value: 'varicella', label: 'Varicella' },
  { value: 'hepatitis_a', label: 'Hepatitis A' },
  { value: 'other', label: 'Other' }
]

const ImmunizationRecords = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [vaccineFilter, setVaccineFilter] = useState('')
  const [formData, setFormData] = useState({
    employeeId: '',
    vaccineType: '',
    vaccineName: '',
    doseNumber: 1,
    totalDosesRequired: 1,
    vaccinationDate: new Date().toISOString().split('T')[0],
    batchNumber: '',
    manufacturer: '',
    vaccinationSite: '',
    status: 'completed'
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
    queryKey: ['immunization-records', statusFilter, vaccineFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (vaccineFilter) params.vaccineType = vaccineFilter
      const response = await api.get('/occupational-health/immunizations', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/occupational-health/immunizations', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['immunization-records'])
      setShowModal(false)
      resetForm()
      showToast('Immunization record created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create record', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      employeeId: '',
      vaccineType: '',
      vaccineName: '',
      doseNumber: 1,
      totalDosesRequired: 1,
      vaccinationDate: new Date().toISOString().split('T')[0],
      batchNumber: '',
      manufacturer: '',
      vaccinationSite: '',
      status: 'completed'
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.vaccineType || !formData.vaccinationDate) {
      showToast('Employee, vaccine type, and vaccination date are required', 'error')
      return
    }

    // Set total doses based on vaccine type
    if (formData.vaccineType === 'hbv') {
      formData.totalDosesRequired = 3
    } else if (formData.vaccineType === 'covid') {
      formData.totalDosesRequired = 2
    } else {
      formData.totalDosesRequired = 1
    }

    createMutation.mutate(formData)
  }

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      declined: 'bg-red-100 text-red-800',
      exempt: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Immunization Records</h1>
          <p className="text-gray-600 mt-1">Track employee immunization records</p>
        </div>
        {(isHR || isAdmin) && (
          <Button onClick={() => {
            resetForm()
            setShowModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Immunization
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Filter by Vaccine Type"
            value={vaccineFilter}
            onChange={(e) => setVaccineFilter(e.target.value)}
            options={[
              { value: '', label: 'All Vaccines' },
              ...VACCINE_TYPES
            ]}
          />
          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'completed', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
              { value: 'declined', label: 'Declined' },
              { value: 'exempt', label: 'Exempt' }
            ]}
          />
        </div>
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
                      <Heart className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {VACCINE_TYPES.find(v => v.value === record.vaccineType)?.label || record.vaccineType}
                      </h3>
                      {getStatusBadge(record.status)}
                    </div>

                    {isHR || isAdmin ? (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Employee:</span> {record.employee?.firstName} {record.employee?.lastName}
                      </p>
                    ) : null}

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Dose:</span> {record.doseNumber} / {record.totalDosesRequired}
                    </p>

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Vaccination Date:</span> {format(new Date(record.vaccinationDate), 'MMM dd, yyyy')}
                    </p>

                    {record.nextDueDate && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Next Due:</span> {format(new Date(record.nextDueDate), 'MMM dd, yyyy')}
                      </p>
                    )}

                    {record.vaccineName && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Vaccine:</span> {record.vaccineName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Heart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No immunization records found</h3>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        title="Add Immunization Record"
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

          <Select
            label="Vaccine Type"
            required
            value={formData.vaccineType}
            onChange={(e) => {
              const vaccineType = e.target.value
              let totalDoses = 1
              if (vaccineType === 'hbv') totalDoses = 3
              else if (vaccineType === 'covid') totalDoses = 2
              setFormData({ ...formData, vaccineType, totalDosesRequired: totalDoses })
            }}
            options={[
              { value: '', label: 'Select Vaccine Type' },
              ...VACCINE_TYPES
            ]}
          />

          {formData.vaccineType === 'covid' && (
            <Input
              label="Vaccine Name"
              value={formData.vaccineName}
              onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
              placeholder="e.g., Covishield, Covaxin"
            />
          )}

          <Input
            label="Dose Number"
            type="number"
            min="1"
            max={formData.totalDosesRequired}
            required
            value={formData.doseNumber}
            onChange={(e) => setFormData({ ...formData, doseNumber: parseInt(e.target.value) || 1 })}
          />

          <DatePicker
            label="Vaccination Date"
            required
            value={formData.vaccinationDate}
            onChange={(date) => setFormData({ ...formData, vaccinationDate: date })}
          />

          <Input
            label="Batch Number (Optional)"
            value={formData.batchNumber}
            onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
          />

          <Input
            label="Manufacturer (Optional)"
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
          />

          <Input
            label="Vaccination Site (Optional)"
            value={formData.vaccinationSite}
            onChange={(e) => setFormData({ ...formData, vaccinationSite: e.target.value })}
            placeholder="Hospital/Clinic name"
          />

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
              Add Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ImmunizationRecords

