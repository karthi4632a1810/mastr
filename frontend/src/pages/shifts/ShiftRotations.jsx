import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Edit, Trash2, RotateCw, Clock } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'

const ShiftRotations = () => {
  const { isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pattern: [{ day: 1, shift: '' }],
    startDate: '',
    isActive: true
  })

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await api.get('/shifts', { params: { isActive: true } })
      return response.data.data || []
    },
  })

  const { data: rotations, isLoading, error } = useQuery({
    queryKey: ['shift-rotations'],
    queryFn: async () => {
      const response = await api.get('/shift-rotations')
      return response.data.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load shift rotations', 'error')
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/shift-rotations', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shift-rotations'])
      setShowCreateModal(false)
      resetForm()
      showToast('Shift rotation created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create rotation', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/shift-rotations/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shift-rotations'])
      setShowEditModal(null)
      resetForm()
      showToast('Shift rotation updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update rotation', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/shift-rotations/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shift-rotations'])
      setShowDeleteModal(null)
      showToast('Shift rotation deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete rotation', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pattern: [{ day: 1, shift: '' }],
      startDate: '',
      isActive: true
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.name.trim()) {
      showToast('Rotation name is required', 'error')
      return
    }
    if (formData.name.trim().length < 3) {
      showToast('Rotation name must be at least 3 characters', 'error')
      return
    }
    if (!formData.pattern || formData.pattern.length === 0) {
      showToast('At least one pattern day is required', 'error')
      return
    }
    if (!formData.pattern.every(p => p.shift)) {
      showToast('All pattern shifts are required', 'error')
      return
    }
    
    if (showEditModal) {
      updateMutation.mutate({ id: showEditModal._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const addPatternDay = () => {
    setFormData({
      ...formData,
      pattern: [...formData.pattern, { day: formData.pattern.length + 1, shift: '' }]
    })
  }

  const removePatternDay = (index) => {
    setFormData({
      ...formData,
      pattern: formData.pattern.filter((_, i) => i !== index).map((p, i) => ({ ...p, day: i + 1 }))
    })
  }

  const updatePatternShift = (index, shiftId) => {
    const newPattern = [...formData.pattern]
    newPattern[index].shift = shiftId
    setFormData({ ...formData, pattern: newPattern })
  }

  const handleEdit = (rotation) => {
    setShowEditModal(rotation)
    setFormData({
      name: rotation.name,
      description: rotation.description || '',
      pattern: rotation.pattern || [{ day: 1, shift: '' }],
      startDate: rotation.startDate || '',
      isActive: rotation.isActive !== undefined ? rotation.isActive : true
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Rotations</h1>
          <p className="text-gray-600 mt-1">Create and manage shift rotation patterns</p>
        </div>
        {(isHR || isAdmin) && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Rotation
          </Button>
        )}
      </div>

      {/* Rotations List */}
      <div className="card">
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading shift rotations..." />
        ) : error ? (
          <EmptyState
            icon={RotateCw}
            title="Error loading rotations"
            message={error.response?.data?.message || 'Failed to load shift rotations. Please try again.'}
          />
        ) : rotations && rotations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rotations.map((rotation) => (
              <div key={rotation._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{rotation.name}</h3>
                    {rotation.description && (
                      <p className="text-sm text-gray-500 mt-1">{rotation.description}</p>
                    )}
                  </div>
                  <RotateCw className="h-5 w-5 text-primary-600" />
                </div>

                <div className="space-y-2 text-sm">
                  {rotation.pattern && rotation.pattern.length > 0 && (
                    <div>
                      <span className="font-medium text-gray-700">Rotation Pattern:</span>
                      <div className="mt-1 space-y-1">
                        {rotation.pattern.map((p, idx) => (
                          <div key={idx} className="text-gray-600">
                            Day {p.day}: {p.shift?.name || 'N/A'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {(isHR || isAdmin) && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(rotation)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowDeleteModal(rotation)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={RotateCw}
            title="No shift rotations found"
            message="Create your first shift rotation to get started"
            actionLabel={(isHR || isAdmin) ? "Create Rotation" : undefined}
            onAction={(isHR || isAdmin) ? () => setShowCreateModal(true) : undefined}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!showEditModal}
        title={showEditModal ? 'Edit Shift Rotation' : 'Create Shift Rotation'}
        onClose={() => {
          setShowCreateModal(false)
          setShowEditModal(null)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Rotation Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Rotation Pattern</label>
              <Button type="button" variant="secondary" size="sm" onClick={addPatternDay}>
                <Plus className="h-4 w-4 mr-1" />
                Add Day
              </Button>
            </div>
            <div className="space-y-2">
              {formData.pattern.map((pattern, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 w-16">Day {pattern.day}:</span>
                  <Select
                    value={pattern.shift}
                    onChange={(e) => updatePatternShift(index, e.target.value)}
                    options={[
                      { value: '', label: 'Select shift' },
                      ...(shifts?.map(s => ({ value: s._id, label: `${s.name} (${s.startTime} - ${s.endTime})` })) || [])
                    ]}
                    className="flex-1"
                  />
                  {formData.pattern.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removePatternDay(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Input
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>

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
              {showEditModal ? 'Update' : 'Create'} Rotation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={!!showDeleteModal}
          title="Delete Shift Rotation"
          onClose={() => setShowDeleteModal(null)}
        >
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete the rotation <strong>{showDeleteModal.name}</strong>? This action cannot be undone.
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

export default ShiftRotations

