import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Edit, Trash2, Key, Shield } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'

const Permissions = () => {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [moduleFilter, setModuleFilter] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    module: '',
    description: ''
  })

  const { data: permissions, isLoading, error } = useQuery({
    queryKey: ['permissions', moduleFilter],
    queryFn: async () => {
      const params = {}
      if (moduleFilter) params.module = moduleFilter
      const response = moduleFilter
        ? api.get(`/permissions/module/${moduleFilter}`)
        : api.get('/permissions')
      const result = await response
      return result.data.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load permissions', 'error')
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/permissions', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissions'])
      setShowCreateModal(false)
      resetForm()
      showToast('Permission created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create permission', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/permissions/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissions'])
      setShowEditModal(null)
      resetForm()
      showToast('Permission updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update permission', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/permissions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['permissions'])
      setShowDeleteModal(null)
      showToast('Permission deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete permission', 'error')
    },
  })

  const resetForm = () => {
    setFormData({ name: '', code: '', module: '', description: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.code || !formData.module) {
      showToast('Name, code, and module are required', 'error')
      return
    }
    
    if (showEditModal) {
      updateMutation.mutate({ id: showEditModal._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (permission) => {
    setShowEditModal(permission)
    setFormData({
      name: permission.name,
      code: permission.code,
      module: permission.module,
      description: permission.description || ''
    })
  }

  const modules = [...new Set(permissions?.map(p => p.module).filter(Boolean) || [])]

  const groupedPermissions = permissions?.reduce((acc, perm) => {
    const module = perm.module || 'Other'
    if (!acc[module]) acc[module] = []
    acc[module].push(perm)
    return acc
  }, {}) || {}

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Permissions Management</h1>
          <p className="text-gray-600 mt-1">Create and manage system permissions</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Permission
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <Select
          label="Filter by Module"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          options={[
            { value: '', label: 'All Modules' },
            ...modules.map(m => ({ value: m, label: m }))
          ]}
        />
      </div>

      {/* Permissions List */}
      <div className="card">
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading permissions..." />
        ) : error ? (
          <EmptyState
            icon={Key}
            title="Error loading permissions"
            message={error.response?.data?.message || 'Failed to load permissions. Please try again.'}
          />
        ) : Object.keys(groupedPermissions).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedPermissions).map(([module, perms]) => (
              <div key={module}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-primary-600" />
                  {module}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perms.map((permission) => (
                    <div key={permission._id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{permission.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">{permission.code}</p>
                          {permission.description && (
                            <p className="text-sm text-gray-600 mt-2">{permission.description}</p>
                          )}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleEdit(permission)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => setShowDeleteModal(permission)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Key}
            title="No permissions found"
            message="Create your first permission to get started"
            actionLabel={isAdmin ? "Create Permission" : undefined}
            onAction={isAdmin ? () => setShowCreateModal(true) : undefined}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!showEditModal}
        title={showEditModal ? 'Edit Permission' : 'Create Permission'}
        onClose={() => {
          setShowCreateModal(false)
          setShowEditModal(null)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Permission Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Create Employee"
          />

          <Input
            label="Permission Code"
            required
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
            placeholder="e.g., CREATE_EMPLOYEE"
          />

          <Input
            label="Module"
            required
            value={formData.module}
            onChange={(e) => setFormData({ ...formData, module: e.target.value })}
            placeholder="e.g., Employee, Payroll, Attendance"
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

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                setShowEditModal(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {showEditModal ? 'Update' : 'Create'} Permission
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={!!showDeleteModal}
          title="Delete Permission"
          onClose={() => setShowDeleteModal(null)}
        >
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete the permission <strong>{showDeleteModal.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate(showDeleteModal._id)}
              isLoading={deleteMutation.isLoading}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Permissions

