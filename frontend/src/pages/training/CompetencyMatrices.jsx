import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Target, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import ConfirmDialog from '../../components/ConfirmDialog'

const SCOPE_OPTIONS = [
  { value: 'role', label: 'Role-Based' },
  { value: 'department', label: 'Department-Based' },
  { value: 'designation', label: 'Designation-Based' },
  { value: 'global', label: 'Global' }
]

const COMPETENCY_CATEGORIES = [
  { value: 'clinical', label: 'Clinical' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'safety', label: 'Safety' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' }
]

const CompetencyMatrices = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingMatrix, setEditingMatrix] = useState(null)
  const [deleteMatrix, setDeleteMatrix] = useState(null)
  const [scopeFilter, setScopeFilter] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scope: 'role',
    scopeIds: [],
    competencies: [{
      competencyName: '',
      description: '',
      category: 'clinical',
      isMandatory: true,
      requiredLevel: 'intermediate',
      assessmentMethod: 'practical',
      renewalPeriod: null
    }]
  })

  const { data: matrices, isLoading } = useQuery({
    queryKey: ['competency-matrices', scopeFilter],
    queryFn: async () => {
      const params = {}
      if (scopeFilter) params.scope = scopeFilter
      const response = await api.get('/training/competency-matrices', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/training/competency-matrices', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency-matrices'])
      setShowModal(false)
      resetForm()
      showToast('Competency matrix created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create competency matrix', 'error')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.scope) {
      showToast('Name and scope are required', 'error')
      return
    }
    createMutation.mutate(formData)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scope: 'role',
      scopeIds: [],
      competencies: [{
        competencyName: '',
        description: '',
        category: 'clinical',
        isMandatory: true,
        requiredLevel: 'intermediate',
        assessmentMethod: 'practical',
        renewalPeriod: null
      }]
    })
  }

  const addCompetency = () => {
    setFormData({
      ...formData,
      competencies: [...formData.competencies, {
        competencyName: '',
        description: '',
        category: 'clinical',
        isMandatory: true,
        requiredLevel: 'intermediate',
        assessmentMethod: 'practical',
        renewalPeriod: null
      }]
    })
  }

  const removeCompetency = (index) => {
    setFormData({
      ...formData,
      competencies: formData.competencies.filter((_, i) => i !== index)
    })
  }

  const updateCompetency = (index, field, value) => {
    const updated = [...formData.competencies]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, competencies: updated })
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'scope', label: 'Scope' },
    { 
      key: 'competencies', 
      label: 'Competencies',
      render: (value) => value?.length || 0
    },
    { key: 'isActive', label: 'Status', render: (value) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {value ? 'Active' : 'Inactive'}
      </span>
    )}
  ]

  if (!isHR && !isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Competency Matrices</h1>
          <p className="text-gray-600 mt-1">Define competency requirements by role, department, or designation</p>
        </div>
        <Button onClick={() => {
          setEditingMatrix(null)
          resetForm()
          setShowModal(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Matrix
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <Select
          label="Filter by Scope"
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          options={[
            { value: '', label: 'All Scopes' },
            ...SCOPE_OPTIONS
          ]}
        />
      </div>

      {/* Matrices List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : matrices && matrices.length > 0 ? (
          <Table
            data={matrices}
            columns={columns}
            actions={(row) => (
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingMatrix(row)
                    setFormData({
                      name: row.name,
                      description: row.description || '',
                      scope: row.scope,
                      scopeIds: row.scopeIds || [],
                      competencies: row.competencies || []
                    })
                    setShowModal(true)
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )}
          />
        ) : (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No competency matrices found</h3>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        title={editingMatrix ? 'Edit Competency Matrix' : 'Create Competency Matrix'}
        onClose={() => {
          setShowModal(false)
          setEditingMatrix(null)
          resetForm()
        }}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Matrix Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., ICU Nurse Competencies"
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
            />
          </div>

          <Select
            label="Scope"
            required
            value={formData.scope}
            onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
            options={SCOPE_OPTIONS}
          />

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Competencies</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addCompetency}>
                <Plus className="h-4 w-4 mr-1" />
                Add Competency
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {formData.competencies.map((comp, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Competency {index + 1}</h4>
                    {formData.competencies.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeCompetency(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <Input
                    label="Competency Name"
                    required
                    value={comp.competencyName}
                    onChange={(e) => updateCompetency(index, 'competencyName', e.target.value)}
                    placeholder="e.g., IV Cannulation"
                  />

                  <Select
                    label="Category"
                    value={comp.category}
                    onChange={(e) => updateCompetency(index, 'category', e.target.value)}
                    options={COMPETENCY_CATEGORIES}
                  />

                  <Select
                    label="Required Level"
                    value={comp.requiredLevel}
                    onChange={(e) => updateCompetency(index, 'requiredLevel', e.target.value)}
                    options={[
                      { value: 'beginner', label: 'Beginner' },
                      { value: 'intermediate', label: 'Intermediate' },
                      { value: 'advanced', label: 'Advanced' },
                      { value: 'expert', label: 'Expert' }
                    ]}
                  />

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={comp.isMandatory}
                      onChange={(e) => updateCompetency(index, 'isMandatory', e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Mandatory
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                setEditingMatrix(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading}>
              {editingMatrix ? 'Update' : 'Create'} Matrix
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CompetencyMatrices

