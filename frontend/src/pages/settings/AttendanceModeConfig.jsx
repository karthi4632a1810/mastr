import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Edit, Trash2, Settings, MapPin, Users, Shield, Globe, Save } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import { format } from 'date-fns'

const AttendanceModeConfig = () => {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [formData, setFormData] = useState({
    scope: 'global',
    scopeId: '',
    role: '',
    modes: {
      faceRecognition: { enabled: false, required: false, threshold: 0.6 },
      geoFence: { enabled: false, required: false },
      hybrid: { enabled: false, mode: 'or' },
      manualOverride: { enabled: true, allowedRoles: ['admin', 'hr'] }
    },
    description: '',
    priority: 0
  })

  const { data: configs, isLoading } = useQuery({
    queryKey: ['attendance-mode-configs'],
    queryFn: async () => {
      const response = await api.get('/attendance-modes')
      return response.data.data || []
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data.data || []
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/settings/branches')
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/attendance-modes', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-mode-configs'])
      setShowCreateModal(false)
      resetForm()
      showToast('Attendance mode configuration created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create configuration', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/attendance-modes/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-mode-configs'])
      setShowEditModal(null)
      resetForm()
      showToast('Configuration updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update configuration', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/attendance-modes/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['attendance-mode-configs'])
      setShowDeleteModal(null)
      showToast('Configuration deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete configuration', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      scope: 'global',
      scopeId: '',
      role: '',
      modes: {
        faceRecognition: { enabled: false, required: false, threshold: 0.6 },
        geoFence: { enabled: false, required: false },
        hybrid: { enabled: false, mode: 'or' },
        manualOverride: { enabled: true, allowedRoles: ['admin', 'hr'] }
      },
      description: '',
      priority: 0
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const submitData = { ...formData }
    if (formData.scope === 'global') {
      submitData.scopeId = null
      submitData.role = null
    } else if (formData.scope === 'department') {
      submitData.role = null
      if (!submitData.scopeId) {
        showToast('Please select a department', 'error')
        return
      }
    } else if (formData.scope === 'location') {
      submitData.role = null
      if (!submitData.scopeId) {
        showToast('Please select a location', 'error')
        return
      }
    } else if (formData.scope === 'role') {
      submitData.scopeId = null
      if (!submitData.role) {
        showToast('Please select a role', 'error')
        return
      }
    }

    if (showEditModal) {
      updateMutation.mutate({ id: showEditModal._id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const handleEdit = (config) => {
    setShowEditModal(config)
    setFormData({
      scope: config.scope,
      scopeId: config.scopeId?._id || '',
      role: config.role || '',
      modes: config.modes,
      description: config.description || '',
      priority: config.priority || 0
    })
  }

  const toggleMode = (modeKey, field) => {
    setFormData({
      ...formData,
      modes: {
        ...formData.modes,
        [modeKey]: {
          ...formData.modes[modeKey],
          [field]: !formData.modes[modeKey][field]
        }
      }
    })
  }

  const getScopeIcon = (scope) => {
    switch (scope) {
      case 'global': return Globe
      case 'department': return Users
      case 'role': return Shield
      case 'location': return MapPin
      default: return Settings
    }
  }

  const getScopeName = (config) => {
    if (config.scope === 'global') return 'Global'
    if (config.scope === 'department') return config.scopeId?.name || 'Department'
    if (config.scope === 'role') return config.role?.charAt(0).toUpperCase() + config.role?.slice(1)
    if (config.scope === 'location') return config.scopeId?.name || 'Location'
    return 'Unknown'
  }

  // Helper function to check if a configuration has any modes enabled
  const hasEnabledModes = (modes) => {
    return (
      modes?.faceRecognition?.enabled ||
      modes?.geoFence?.enabled ||
      modes?.hybrid?.enabled
    )
  }

  // Filter out configurations with no modes enabled (unset configurations)
  const configuredConfigs = configs?.filter(config => 
    config.isActive && hasEnabledModes(config.modes)
  ) || []

  const groupedConfigs = configuredConfigs.reduce((acc, config) => {
    if (!acc[config.scope]) acc[config.scope] = []
    acc[config.scope].push(config)
    return acc
  }, {})

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Mode Configuration</h1>
          <p className="text-gray-600 mt-1">Configure attendance methods (Face Recognition, Geo Fence, Hybrid)</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Configuration
          </Button>
        )}
      </div>

      {/* Configuration List */}
      <div className="space-y-6">
        {Object.keys(groupedConfigs).length === 0 ? (
          <div className="card text-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Modes Configured</h3>
            <p className="text-gray-500 mb-4">
              {isAdmin 
                ? 'Create your first attendance mode configuration to get started.'
                : 'No attendance modes have been configured yet. Contact admin to set up configurations.'}
            </p>
            {isAdmin && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Configuration
              </Button>
            )}
          </div>
        ) : (
          Object.entries(groupedConfigs).map(([scope, configs]) => (
            <div key={scope} className="card">
              <div className="flex items-center gap-2 mb-4">
                {(() => {
                  const Icon = getScopeIcon(scope)
                  return <Icon className="h-5 w-5 text-primary-600" />
                })()}
                <h2 className="text-xl font-semibold text-gray-900 capitalize">{scope} Configurations</h2>
              </div>

              <div className="space-y-4">
                {configs.map((config) => (
                <div key={config._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{getScopeName(config)}</h3>
                      {config.description && (
                        <p className="text-sm text-gray-500 mt-1">{config.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-500">Priority: {config.priority}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setShowDeleteModal(config)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {/* Face Recognition */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Face Recognition</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          config.modes.faceRecognition.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {config.modes.faceRecognition.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {config.modes.faceRecognition.enabled && (
                        <div className="space-y-1">
                          {config.modes.faceRecognition.required && (
                            <span className="text-xs text-orange-600 block">Required</span>
                          )}
                          {config.modes.faceRecognition.threshold !== undefined && (
                            <span className="text-xs text-gray-600 block">
                              Threshold: {(config.modes.faceRecognition.threshold * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Geo Fence */}
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Geo Fence</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          config.modes.geoFence.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {config.modes.geoFence.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {config.modes.geoFence.enabled && config.modes.geoFence.required && (
                        <span className="text-xs text-orange-600">Required</span>
                      )}
                    </div>

                    {/* Hybrid */}
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Hybrid</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          config.modes.hybrid.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {config.modes.hybrid.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {config.modes.hybrid.enabled && (
                        <span className="text-xs text-gray-600">
                          Mode: {config.modes.hybrid.mode === 'or' ? 'Face OR Geo' : 'Face AND Geo'}
                        </span>
                      )}
                    </div>

                    {/* Manual Override */}
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Manual Override</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          config.modes.manualOverride.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {config.modes.manualOverride.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {config.modes.manualOverride.enabled && (
                        <span className="text-xs text-gray-600">
                          Roles: {config.modes.manualOverride.allowedRoles?.join(', ') || 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>

                  {config.updatedBy && (
                    <div className="text-xs text-gray-500 mt-3">
                      Last updated by {config.updatedBy?.email} on {format(new Date(config.updatedAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!showEditModal}
        title={showEditModal ? 'Edit Configuration' : 'Create Attendance Mode Configuration'}
        onClose={() => {
          setShowCreateModal(false)
          setShowEditModal(null)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Scope"
            required
            value={formData.scope}
            onChange={(e) => {
              setFormData({
                ...formData,
                scope: e.target.value,
                scopeId: '',
                role: ''
              })
            }}
            options={[
              { value: 'global', label: 'Global (All Employees)' },
              { value: 'department', label: 'Department' },
              { value: 'role', label: 'Role' },
              { value: 'location', label: 'Location/Branch' }
            ]}
          />

          {formData.scope === 'department' && (
            <Select
              label="Department"
              required
              value={formData.scopeId}
              onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })}
              options={[
                { value: '', label: 'Select department' },
                ...(departments?.map(dept => ({ value: dept._id, label: `${dept.name} (${dept.code})` })) || [])
              ]}
            />
          )}

          {formData.scope === 'location' && (
            <Select
              label="Location/Branch"
              required
              value={formData.scopeId}
              onChange={(e) => setFormData({ ...formData, scopeId: e.target.value })}
              options={[
                { value: '', label: 'Select location' },
                ...(branches?.map(branch => ({ value: branch._id, label: `${branch.name} (${branch.code})` })) || [])
              ]}
            />
          )}

          {formData.scope === 'role' && (
            <Select
              label="Role"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: '', label: 'Select role' },
                { value: 'admin', label: 'Admin' },
                { value: 'hr', label: 'HR' },
                { value: 'employee', label: 'Employee' }
              ]}
            />
          )}

          <Input
            label="Priority (higher number = higher priority)"
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
          />

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Attendance Modes</h4>

            {/* Face Recognition */}
            <div className="space-y-2 mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.modes.faceRecognition.enabled}
                    onChange={() => toggleMode('faceRecognition', 'enabled')}
                    className="mr-2"
                  />
                  <span className="font-medium text-gray-700">Face Recognition</span>
                </label>
              </div>
              {formData.modes.faceRecognition.enabled && (
                <div className="ml-6 space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.modes.faceRecognition.required}
                      onChange={() => toggleMode('faceRecognition', 'required')}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">Required (mandatory)</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Face Match Threshold: {(formData.modes.faceRecognition.threshold * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={formData.modes.faceRecognition.threshold || 0.6}
                      onChange={(e) => setFormData({
                        ...formData,
                        modes: {
                          ...formData.modes,
                          faceRecognition: {
                            ...formData.modes.faceRecognition,
                            threshold: parseFloat(e.target.value)
                          }
                        }
                      })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0% (Lenient)</span>
                      <span>50% (Moderate)</span>
                      <span>100% (Strict)</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Higher threshold = stricter matching. Recommended: 60% (0.6)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Geo Fence */}
            <div className="space-y-2 mb-4 p-3 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.modes.geoFence.enabled}
                    onChange={() => toggleMode('geoFence', 'enabled')}
                    className="mr-2"
                  />
                  <span className="font-medium text-gray-700">Geo Fence</span>
                </label>
              </div>
              {formData.modes.geoFence.enabled && (
                <label className="flex items-center ml-6">
                  <input
                    type="checkbox"
                    checked={formData.modes.geoFence.required}
                    onChange={() => toggleMode('geoFence', 'required')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Required (mandatory)</span>
                </label>
              )}
            </div>

            {/* Hybrid */}
            <div className="space-y-2 mb-4 p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.modes.hybrid.enabled}
                    onChange={() => toggleMode('hybrid', 'enabled')}
                    className="mr-2"
                  />
                  <span className="font-medium text-gray-700">Hybrid Mode</span>
                </label>
              </div>
              {formData.modes.hybrid.enabled && (
                <Select
                  label="Hybrid Mode Type"
                  value={formData.modes.hybrid.mode}
                  onChange={(e) => setFormData({
                    ...formData,
                    modes: {
                      ...formData.modes,
                      hybrid: { ...formData.modes.hybrid, mode: e.target.value }
                    }
                  })}
                  options={[
                    { value: 'or', label: 'Face OR Geo (either one required)' },
                    { value: 'and', label: 'Face AND Geo (both required - Strict)' }
                  ]}
                />
              )}
            </div>

            {/* Manual Override */}
            <div className="space-y-2 mb-4 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.modes.manualOverride.enabled}
                    onChange={() => toggleMode('manualOverride', 'enabled')}
                    className="mr-2"
                  />
                  <span className="font-medium text-gray-700">Manual/HR Override</span>
                </label>
              </div>
              {formData.modes.manualOverride.enabled && (
                <div className="ml-6 space-y-2">
                  <label className="block text-sm text-gray-600 mb-1">Allowed Roles:</label>
                  {['admin', 'hr'].map(role => (
                    <label key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.modes.manualOverride.allowedRoles.includes(role)}
                        onChange={(e) => {
                          const allowedRoles = e.target.checked
                            ? [...formData.modes.manualOverride.allowedRoles, role]
                            : formData.modes.manualOverride.allowedRoles.filter(r => r !== role)
                          setFormData({
                            ...formData,
                            modes: {
                              ...formData.modes,
                              manualOverride: { ...formData.modes.manualOverride, allowedRoles }
                            }
                          })
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-600 capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              placeholder="Optional description"
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
              <Save className="h-4 w-4 mr-2" />
              {showEditModal ? 'Update' : 'Create'} Configuration
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={!!showDeleteModal}
          title="Delete Configuration"
          onClose={() => setShowDeleteModal(null)}
        >
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete the configuration for <strong>{getScopeName(showDeleteModal)}</strong>? This action cannot be undone.
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

export default AttendanceModeConfig

