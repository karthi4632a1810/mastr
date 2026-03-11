import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Edit, Copy, Trash2, Clock, CheckCircle, XCircle, Search } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import { format } from 'date-fns'

const Shifts = () => {
  const { isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'regular',
    startTime: '',
    endTime: '',
    breakDuration: 0,
    breakType: 'unpaid',
    isFlexible: false,
    graceLateMinutes: 10,
    graceEarlyMinutes: 10,
    minHoursPresent: 8,
    halfDayHours: 4,
    overtimeEligible: false,
    weekOffs: [],
    isActive: true
  })

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', search, isActiveFilter],
    queryFn: async () => {
      const params = {}
      if (search) params.search = search
      if (isActiveFilter !== '') params.isActive = isActiveFilter === 'true'
      const response = await api.get('/shifts', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/shifts', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      setShowCreateModal(false)
      resetForm()
      showToast('Shift created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create shift', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/shifts/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      setShowEditModal(null)
      resetForm()
      showToast('Shift updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update shift', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/shifts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      setShowDeleteModal(null)
      showToast('Shift deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete shift', 'error')
    },
  })

  const cloneMutation = useMutation({
    mutationFn: async (id) => {
      return api.post(`/shifts/${id}/clone`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      showToast('Shift cloned successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to clone shift', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      category: 'regular',
      startTime: '',
      endTime: '',
      breakDuration: 0,
      breakType: 'unpaid',
      isFlexible: false,
      graceLateMinutes: 10,
      graceEarlyMinutes: 10,
      minHoursPresent: 8,
      halfDayHours: 4,
      overtimeEligible: false,
      weekOffs: [],
      isActive: true
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.code || !formData.startTime || !formData.endTime) {
      showToast('Name, code, start time, and end time are required', 'error')
      return
    }
    
    if (showEditModal) {
      updateMutation.mutate({ id: showEditModal._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (shift) => {
    setShowEditModal(shift)
    setFormData({
      name: shift.name,
      code: shift.code,
      category: shift.category || 'regular',
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakDuration: shift.breakDuration || 0,
      breakType: shift.breakType || 'unpaid',
      isFlexible: shift.isFlexible || false,
      graceLateMinutes: shift.graceLateMinutes || 10,
      graceEarlyMinutes: shift.graceEarlyMinutes || 10,
      minHoursPresent: shift.minHoursPresent || 8,
      halfDayHours: shift.halfDayHours || 4,
      overtimeEligible: shift.overtimeEligible || false,
      weekOffs: shift.weekOffs || [],
      isActive: shift.isActive !== undefined ? shift.isActive : true
    })
  }

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-gray-600 mt-1">Create and manage work shifts</p>
        </div>
        {(isHR || isAdmin) && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or code"
            icon={<Search className="h-4 w-4" />}
          />
          <Select
            label="Status"
            value={isActiveFilter}
            onChange={(e) => setIsActiveFilter(e.target.value)}
            options={[
              { value: '', label: 'All' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
          />
        </div>
      </div>

      {/* Shifts List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : shifts && shifts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <div key={shift._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{shift.name}</h3>
                    <p className="text-sm text-gray-500">{shift.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {shift.isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {shift.startTime} - {shift.endTime}
                    </span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-medium">Working Hours:</span> {shift.workingHours || 0} hrs
                  </div>
                  {shift.breakDuration > 0 && (
                    <div className="text-gray-600">
                      <span className="font-medium">Break:</span> {shift.breakDuration} min ({shift.breakType})
                    </div>
                  )}
                  <div className="text-gray-600">
                    <span className="font-medium">Category:</span> {shift.category}
                  </div>
                  {shift.weekOffs && shift.weekOffs.length > 0 && (
                    <div className="text-gray-600">
                      <span className="font-medium">Week Offs:</span> {shift.weekOffs.join(', ')}
                    </div>
                  )}
                </div>

                {(isHR || isAdmin) && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(shift)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => cloneMutation.mutate(shift._id)}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Clone
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowDeleteModal(shift)}
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
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No shifts found</h3>
            <p className="mt-1 text-sm text-gray-500">Create your first shift to get started</p>
          </div>
        )}
      </div>

      {/* Create/Edit Shift Modal */}
      <Modal
        isOpen={showCreateModal || !!showEditModal}
        title={showEditModal ? 'Edit Shift' : 'Create Shift'}
        onClose={() => {
          setShowCreateModal(false)
          setShowEditModal(null)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Shift Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Shift Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <Select
            label="Category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={[
              { value: 'regular', label: 'Regular' },
              { value: 'night', label: 'Night' },
              { value: 'rotational', label: 'Rotational' },
              { value: 'flexible', label: 'Flexible' }
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              required
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              required
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Break Duration (minutes)"
              type="number"
              value={formData.breakDuration}
              onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 0 })}
            />
            <Select
              label="Break Type"
              value={formData.breakType}
              onChange={(e) => setFormData({ ...formData, breakType: e.target.value })}
              options={[
                { value: 'paid', label: 'Paid' },
                { value: 'unpaid', label: 'Unpaid' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Grace Late (minutes)"
              type="number"
              value={formData.graceLateMinutes}
              onChange={(e) => setFormData({ ...formData, graceLateMinutes: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Grace Early (minutes)"
              type="number"
              value={formData.graceEarlyMinutes}
              onChange={(e) => setFormData({ ...formData, graceEarlyMinutes: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Min Hours Present"
              type="number"
              value={formData.minHoursPresent}
              onChange={(e) => setFormData({ ...formData, minHoursPresent: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Half Day Hours"
              type="number"
              value={formData.halfDayHours}
              onChange={(e) => setFormData({ ...formData, halfDayHours: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isFlexible}
                onChange={(e) => setFormData({ ...formData, isFlexible: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Flexible Shift</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.overtimeEligible}
                onChange={(e) => setFormData({ ...formData, overtimeEligible: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Overtime Eligible</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Week Offs</label>
            <div className="grid grid-cols-2 gap-2">
              {weekDays.map((day) => (
                <label key={day} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.weekOffs.includes(day)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, weekOffs: [...formData.weekOffs, day] })
                      } else {
                        setFormData({ ...formData, weekOffs: formData.weekOffs.filter(d => d !== day) })
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{day}</span>
                </label>
              ))}
            </div>
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
              {showEditModal ? 'Update' : 'Create'} Shift
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={!!showDeleteModal}
          title="Delete Shift"
          onClose={() => setShowDeleteModal(null)}
        >
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete the shift <strong>{showDeleteModal.name}</strong>? This action cannot be undone.
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

export default Shifts

