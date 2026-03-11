import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Edit, Trash2, Shield, Users, Key } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'

const Roles = () => {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: []
  })
  const [selectedPermissions, setSelectedPermissions] = useState([])

  const { data: roles, isLoading, error } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/roles')
      return response.data.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load roles', 'error')
    },
  })

  const { data: permissions } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get('/permissions')
      return response.data.data || []
    },
    enabled: !!showPermissionsModal
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/roles', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowCreateModal(false)
      resetForm()
      showToast('Role created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create role', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/roles/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowEditModal(null)
      resetForm()
      showToast('Role updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update role', 'error')
    },
  })

  const assignPermissionsMutation = useMutation({
    mutationFn: async ({ id, permissions }) => {
      return api.put(`/roles/${id}/permissions`, { permissions })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowPermissionsModal(null)
      setSelectedPermissions([])
      showToast('Permissions assigned successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to assign permissions', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/roles/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowDeleteModal(null)
      showToast('Role deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete role', 'error')
    },
  })

  const resetForm = () => {
    setFormData({ name: '', description: '', permissions: [] })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name) {
      showToast('Role name is required', 'error')
      return
    }
    
    if (showEditModal) {
      updateMutation.mutate({ id: showEditModal._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (role) => {
    setShowEditModal(role)
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || []
    })
  }

  const handlePermissions = (role) => {
    setShowPermissionsModal(role)
    setSelectedPermissions(role.permissions?.map(p => p._id || p) || [])
  }

  const togglePermission = (permissionId) => {
    if (selectedPermissions.includes(permissionId)) {
      setSelectedPermissions(selectedPermissions.filter(id => id !== permissionId))
    } else {
      setSelectedPermissions([...selectedPermissions, permissionId])
    }
  }

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
          <h1 className="text-3xl font-bold text-gray-900">Roles Management</h1>
          <p className="text-gray-600 mt-1">Create and manage user roles</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        )}
      </div>

      {/* Roles List */}
      <div className="card">
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading roles..." />
        ) : error ? (
          <EmptyState
            icon={Shield}
            title="Error loading roles"
            message={error.response?.data?.message || 'Failed to load roles. Please try again.'}
          />
        ) : roles && roles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                      {role.description && (
                        <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600 mb-3">
                  <span className="font-medium">Permissions:</span> {role.permissions?.length || 0}
                </div>

                {isAdmin && (
                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePermissions(role)}
                      className="flex-1"
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Permissions
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(role)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteModal(role)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Shield}
            title="No roles found"
            message="Create your first role to get started"
            actionLabel={isAdmin ? "Create Role" : undefined}
            onAction={isAdmin ? () => setShowCreateModal(true) : undefined}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!showEditModal}
        title={showEditModal ? 'Edit Role' : 'Create Role'}
        onClose={() => {
          setShowCreateModal(false)
          setShowEditModal(null)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Role Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Manager, Supervisor"
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
              {showEditModal ? 'Update' : 'Create'} Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <Modal
          isOpen={!!showPermissionsModal}
          title={`Manage Permissions - ${showPermissionsModal.name}`}
          onClose={() => {
            setShowPermissionsModal(null)
            setSelectedPermissions([])
          }}
        >
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto space-y-4">
              {Object.entries(groupedPermissions).map(([module, perms]) => (
                <div key={module} className="border border-gray-200 rounded-lg p-3">
                  <h4 className="font-semibold text-gray-900 mb-2">{module}</h4>
                  <div className="space-y-2">
                    {perms.map((perm) => (
                      <label key={perm._id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(perm._id)}
                          onChange={() => togglePermission(perm._id)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{perm.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPermissionsModal(null)
                  setSelectedPermissions([])
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => assignPermissionsMutation.mutate({
                  id: showPermissionsModal._id,
                  permissions: selectedPermissions
                })}
                isLoading={assignPermissionsMutation.isLoading}
              >
                Save Permissions
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={!!showDeleteModal}
          title="Delete Role"
          onClose={() => setShowDeleteModal(null)}
        >
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete the role <strong>{showDeleteModal.name}</strong>? This action cannot be undone.
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

export default Roles

