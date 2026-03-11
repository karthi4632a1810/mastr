import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, GraduationCap, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import ConfirmDialog from '../../components/ConfirmDialog'

const TRAINING_CATEGORIES = [
  { value: 'bls', label: 'BLS (Basic Life Support)' },
  { value: 'acls', label: 'ACLS (Advanced Cardiac Life Support)' },
  { value: 'infection_control', label: 'Infection Control' },
  { value: 'fire_safety', label: 'Fire Safety' },
  { value: 'radiation_safety', label: 'Radiation Safety' },
  { value: 'biomedical_waste', label: 'Biomedical Waste Management' },
  { value: 'patient_safety', label: 'Patient Safety & Quality' },
  { value: 'nabh_standards', label: 'NABH Standards Orientation' },
  { value: 'clinical_skills', label: 'Clinical Skills' },
  { value: 'medication_safety', label: 'Medication Safety' },
  { value: 'other', label: 'Other' }
]

const TRAINING_METHODS = [
  { value: 'classroom', label: 'Classroom' },
  { value: 'online', label: 'Online' },
  { value: 'hands_on', label: 'Hands-On' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'external', label: 'External' }
]

const TrainingPrograms = () => {
  const { user, isHR, isAdmin, loading: authLoading } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)
  const [deleteProgram, setDeleteProgram] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    isMandatory: false,
    validityPeriod: null,
    renewalRequired: false,
    trainingMethod: 'classroom',
    duration: { hours: 0, days: 0 },
    requiresAssessment: true,
    passingScore: 70,
    requiresCertificate: true,
    nabhClauses: []
  })

  const { data: programs, isLoading, error: programsError } = useQuery({
    queryKey: ['training-programs', categoryFilter],
    queryFn: async () => {
      const params = {}
      if (categoryFilter) params.category = categoryFilter
      const response = await api.get('/training/programs', { params })
      return response.data?.data || []
    },
    retry: 1,
    onError: (error) => {
      console.error('Training programs query error:', error)
      // Only show toast if not already handled by API interceptor
      if (error.response?.status !== 401) {
        showToast(error.response?.data?.message || 'Failed to load training programs', 'error')
      }
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/training/programs', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-programs'])
      setShowModal(false)
      resetForm()
      showToast('Training program created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create training program', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/training/programs/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-programs'])
      setShowModal(false)
      setEditingProgram(null)
      resetForm()
      showToast('Training program updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update training program', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/training/programs/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-programs'])
      setDeleteProgram(null)
      showToast('Training program deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete training program', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      category: '',
      isMandatory: false,
      validityPeriod: null,
      renewalRequired: false,
      trainingMethod: 'classroom',
      duration: { hours: 0, days: 0 },
      requiresAssessment: true,
      passingScore: 70,
      requiresCertificate: true,
      nabhClauses: []
    })
  }

  const handleEdit = (program) => {
    setEditingProgram(program)
    setFormData({
      name: program.name,
      code: program.code,
      description: program.description || '',
      category: program.category,
      isMandatory: program.isMandatory || false,
      validityPeriod: program.validityPeriod || null,
      renewalRequired: program.renewalRequired || false,
      trainingMethod: program.trainingMethod || 'classroom',
      duration: program.duration || { hours: 0, days: 0 },
      requiresAssessment: program.requiresAssessment !== false,
      passingScore: program.passingScore || 70,
      requiresCertificate: program.requiresCertificate !== false,
      nabhClauses: program.nabhClauses || []
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.code || !formData.category) {
      showToast('Name, code, and category are required', 'error')
      return
    }

    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { 
      key: 'category', 
      label: 'Category',
      render: (value) => {
        if (!value) return 'N/A'
        // Convert category enum to readable format
        const categoryLabels = {
          'bls': 'BLS',
          'acls': 'ACLS',
          'infection_control': 'Infection Control',
          'fire_safety': 'Fire Safety',
          'radiation_safety': 'Radiation Safety',
          'biomedical_waste': 'Biomedical Waste',
          'patient_safety': 'Patient Safety',
          'nabh_standards': 'NABH Standards',
          'clinical_skills': 'Clinical Skills',
          'medication_safety': 'Medication Safety',
          'other': 'Other'
        }
        return categoryLabels[value] || value
      }
    },
    { 
      key: 'isMandatory', 
      label: 'Mandatory',
      render: (value) => value ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-gray-400" />
      )
    },
    { key: 'validityPeriod', label: 'Validity (months)', render: (value) => value || 'N/A' },
    { key: 'isActive', label: 'Status', render: (value) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {value ? 'Active' : 'Inactive'}
      </span>
    )}
  ]

  if (authLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isHR && !isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">You don't have permission to access this page.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Training Programs</h1>
          <p className="text-gray-600 mt-1">Manage training programs and mandatory requirements</p>
        </div>
        <Button onClick={() => {
          setEditingProgram(null)
          resetForm()
          setShowModal(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Program
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <Select
          label="Filter by Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            ...TRAINING_CATEGORIES
          ]}
        />
      </div>

      {/* Programs List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : programsError ? (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading training programs</h3>
            <p className="mt-1 text-sm text-gray-500">
              {programsError.response?.data?.message || programsError.message || 'Failed to load training programs'}
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => queryClient.invalidateQueries(['training-programs'])}
            >
              Retry
            </Button>
          </div>
        ) : programs && programs.length > 0 ? (
          <Table
            data={programs}
            columns={columns}
            actions={(row) => (
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleEdit(row)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteProgram(row)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        ) : (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No training programs found</h3>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        title={editingProgram ? 'Edit Training Program' : 'Create Training Program'}
        onClose={() => {
          setShowModal(false)
          setEditingProgram(null)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Program Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Basic Life Support (BLS)"
          />

          <Input
            label="Program Code"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., BLS"
          />

          <Select
            label="Category"
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={[
              { value: '', label: 'Select Category' },
              ...TRAINING_CATEGORIES
            ]}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Program description"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isMandatory"
              checked={formData.isMandatory}
              onChange={(e) => setFormData({ ...formData, isMandatory: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isMandatory" className="ml-2 block text-sm text-gray-900">
              Mandatory Training
            </label>
          </div>

          <Input
            label="Validity Period (months)"
            type="number"
            value={formData.validityPeriod || ''}
            onChange={(e) => setFormData({ ...formData, validityPeriod: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="e.g., 24 for 2 years"
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="renewalRequired"
              checked={formData.renewalRequired}
              onChange={(e) => setFormData({ ...formData, renewalRequired: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="renewalRequired" className="ml-2 block text-sm text-gray-900">
              Renewal Required
            </label>
          </div>

          <Select
            label="Training Method"
            value={formData.trainingMethod}
            onChange={(e) => setFormData({ ...formData, trainingMethod: e.target.value })}
            options={TRAINING_METHODS}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresAssessment"
              checked={formData.requiresAssessment}
              onChange={(e) => setFormData({ ...formData, requiresAssessment: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="requiresAssessment" className="ml-2 block text-sm text-gray-900">
              Requires Assessment
            </label>
          </div>

          {formData.requiresAssessment && (
            <Input
              label="Passing Score (%)"
              type="number"
              min="0"
              max="100"
              value={formData.passingScore}
              onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 70 })}
            />
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                setEditingProgram(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {editingProgram ? 'Update' : 'Create'} Program
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteProgram}
        title="Delete Training Program"
        message={`Are you sure you want to delete "${deleteProgram?.name}"? This action cannot be undone.`}
        onConfirm={() => {
          deleteMutation.mutate(deleteProgram._id)
        }}
        onCancel={() => setDeleteProgram(null)}
        isLoading={deleteMutation.isLoading}
      />
    </div>
  )
}

export default TrainingPrograms

