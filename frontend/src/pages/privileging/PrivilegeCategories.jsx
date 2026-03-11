import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Shield, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import ConfirmDialog from '../../components/ConfirmDialog'

const CATEGORY_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'specialty', label: 'Specialty' },
  { value: 'emergency', label: 'Emergency' }
]

const PrivilegeCategories = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [deleteCategory, setDeleteCategory] = useState(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    categoryType: 'general',
    defaultValidityPeriod: 36,
    renewalRequired: true,
    renewalRequirements: {
      cmeHours: 0,
      caseLogRequired: false,
      minimumCases: 0,
      reassessmentRequired: false
    }
  })

  const { data: categories, isLoading } = useQuery({
    queryKey: ['privilege-categories', typeFilter],
    queryFn: async () => {
      const params = {}
      if (typeFilter) params.categoryType = typeFilter
      const response = await api.get('/privileging/categories', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/privileging/categories', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['privilege-categories'])
      setShowModal(false)
      resetForm()
      showToast('Privilege category created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create category', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/privileging/categories/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['privilege-categories'])
      setShowModal(false)
      setEditingCategory(null)
      resetForm()
      showToast('Privilege category updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update category', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      categoryType: 'general',
      defaultValidityPeriod: 36,
      renewalRequired: true,
      renewalRequirements: {
        cmeHours: 0,
        caseLogRequired: false,
        minimumCases: 0,
        reassessmentRequired: false
      }
    })
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || '',
      categoryType: category.categoryType,
      defaultValidityPeriod: category.defaultValidityPeriod || 36,
      renewalRequired: category.renewalRequired !== false,
      renewalRequirements: category.renewalRequirements || {
        cmeHours: 0,
        caseLogRequired: false,
        minimumCases: 0,
        reassessmentRequired: false
      }
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.code || !formData.categoryType) {
      showToast('Name, code, and category type are required', 'error')
      return
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'categoryType', label: 'Type' },
    { key: 'defaultValidityPeriod', label: 'Validity (months)' },
    { 
      key: 'renewalRequired', 
      label: 'Renewal Required',
      render: (value) => value ? (
        <CheckCircle className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-gray-400" />
      )
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
          <h1 className="text-3xl font-bold text-gray-900">Privilege Categories</h1>
          <p className="text-gray-600 mt-1">Manage privilege categories and requirements</p>
        </div>
        <Button onClick={() => {
          setEditingCategory(null)
          resetForm()
          setShowModal(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Category
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <Select
          label="Filter by Type"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: '', label: 'All Types' },
            ...CATEGORY_TYPES
          ]}
        />
      </div>

      {/* Categories List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : categories && categories.length > 0 ? (
          <Table
            data={categories}
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
              </div>
            )}
          />
        ) : (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No privilege categories found</h3>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        title={editingCategory ? 'Edit Privilege Category' : 'Create Privilege Category'}
        onClose={() => {
          setShowModal(false)
          setEditingCategory(null)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., General Surgery"
          />

          <Input
            label="Category Code"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., GEN_SURG"
          />

          <Select
            label="Category Type"
            required
            value={formData.categoryType}
            onChange={(e) => setFormData({ ...formData, categoryType: e.target.value })}
            options={CATEGORY_TYPES}
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

          <Input
            label="Default Validity Period (months)"
            type="number"
            value={formData.defaultValidityPeriod}
            onChange={(e) => setFormData({ ...formData, defaultValidityPeriod: parseInt(e.target.value) || 36 })}
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

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                setEditingCategory(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {editingCategory ? 'Update' : 'Create'} Category
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PrivilegeCategories

