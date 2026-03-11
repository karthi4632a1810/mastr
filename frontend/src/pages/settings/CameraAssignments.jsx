import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { Camera, Users, Plus, Edit, Trash2, ToggleLeft, ToggleRight, CheckCircle, XCircle, AlertCircle, UserPlus, Building2, MapPin, Globe } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useLocation } from 'react-router-dom'

const CameraAssignments = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const location = useLocation()
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [deleteAssignment, setDeleteAssignment] = useState(null)
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [filterCamera, setFilterCamera] = useState(location.state?.filterCamera || '')

  const [formData, setFormData] = useState({
    cameraId: '',
    employeeId: '',
    autoPunchInEnabled: true,
    priority: 1,
    notes: ''
  })

  const [bulkFormData, setBulkFormData] = useState({
    cameraId: '',
    scope: 'all', // 'all', 'department', 'location'
    scopeId: '',
    autoPunchInEnabled: true,
    priority: 1,
    notes: ''
  })

  const { data: assignments, isLoading } = useQuery({
    queryKey: ['camera-assignments', filterCamera],
    queryFn: async () => {
      const params = filterCamera ? { cameraId: filterCamera } : {}
      const response = await api.get('/camera-assignments', { params })
      return response.data.data || []
    }
  })

  const { data: cameras } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const response = await api.get('/cameras')
      return response.data.data || []
    }
  })

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => {
      // Fetch all employees with pagination
      let allEmployees = []
      let page = 1
      const limit = 100
      let hasMore = true

      while (hasMore) {
        const response = await api.get('/employees', { params: { page, limit } })
        const employeesList = response.data.data || []
        allEmployees = [...allEmployees, ...employeesList]
        
        if (employeesList.length < limit) {
          hasMore = false
        } else {
          page++
        }
      }

      return allEmployees
    }
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data.data || []
    }
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/settings/branches')
      return response.data.data || []
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/camera-assignments', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['camera-assignments'])
      showToast('Camera assigned successfully', 'success')
      setShowModal(false)
      resetForm()
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to assign camera', 'error')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/camera-assignments/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['camera-assignments'])
      showToast('Assignment updated successfully', 'success')
      setShowModal(false)
      resetForm()
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update assignment', 'error')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/camera-assignments/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['camera-assignments'])
      showToast('Assignment deleted successfully', 'success')
      setDeleteAssignment(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete assignment', 'error')
    }
  })

  const bulkAssignMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/camera-assignments/bulk', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['camera-assignments'])
      showToast(
        `Bulk assignment completed: ${data.data?.succeeded || 0} succeeded, ${data.data?.failed || 0} failed`,
        data.data?.failed > 0 ? 'warning' : 'success'
      )
      setShowBulkModal(false)
      resetBulkForm()
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to bulk assign cameras', 'error')
    }
  })

  const toggleAutoPunchMutation = useMutation({
    mutationFn: async ({ id, enabled }) => {
      const response = await api.put(`/camera-assignments/${id}`, { autoPunchInEnabled: enabled })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['camera-assignments'])
      showToast('Auto punch-in toggled successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to toggle auto punch-in', 'error')
    }
  })

  const resetForm = () => {
    setFormData({
      cameraId: '',
      employeeId: '',
      autoPunchInEnabled: true,
      priority: 1,
      notes: ''
    })
    setEditingAssignment(null)
    setSelectedCamera(null)
  }

  const resetBulkForm = () => {
    setBulkFormData({
      cameraId: '',
      scope: 'all',
      scopeId: '',
      autoPunchInEnabled: true,
      priority: 1,
      notes: ''
    })
  }

  const handleBulkSubmit = async (e) => {
    e.preventDefault()
    
    if (!bulkFormData.cameraId) {
      showToast('Please select a camera', 'error')
      return
    }

    if (bulkFormData.scope !== 'all' && !bulkFormData.scopeId) {
      showToast(`Please select a ${bulkFormData.scope}`, 'error')
      return
    }

    // Get employees based on scope
    let targetEmployees = []
    
    if (bulkFormData.scope === 'all') {
      targetEmployees = (employees || []).filter(emp => emp.status === 'active')
    } else if (bulkFormData.scope === 'department') {
      targetEmployees = (employees || []).filter(
        emp => emp.status === 'active' && emp.department?._id === bulkFormData.scopeId
      )
    } else if (bulkFormData.scope === 'location') {
      targetEmployees = (employees || []).filter(
        emp => emp.status === 'active' && emp.branch?._id === bulkFormData.scopeId
      )
    }

    if (targetEmployees.length === 0) {
      showToast(`No active employees found for selected ${bulkFormData.scope}`, 'error')
      return
    }

    // Prepare bulk assignment data
    const assignments = targetEmployees.map(emp => ({
      cameraId: bulkFormData.cameraId,
      employeeId: emp._id,
      autoPunchInEnabled: bulkFormData.autoPunchInEnabled,
      priority: bulkFormData.priority
    }))

    bulkAssignMutation.mutate({ assignments })
  }

  const getScopeEmployeeCount = () => {
    if (bulkFormData.scope === 'all') {
      return (employees || []).filter(emp => emp.status === 'active').length
    } else if (bulkFormData.scope === 'department' && bulkFormData.scopeId) {
      return (employees || []).filter(
        emp => emp.status === 'active' && emp.department?._id === bulkFormData.scopeId
      ).length
    } else if (bulkFormData.scope === 'location' && bulkFormData.scopeId) {
      return (employees || []).filter(
        emp => emp.status === 'active' && emp.branch?._id === bulkFormData.scopeId
      ).length
    }
    return 0
  }

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      cameraId: assignment.camera._id,
      employeeId: assignment.employee._id,
      autoPunchInEnabled: assignment.autoPunchInEnabled,
      priority: assignment.priority || 1,
      notes: assignment.notes || ''
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.cameraId || !formData.employeeId) {
      showToast('Please select camera and employee', 'error')
      return
    }

    if (editingAssignment) {
      updateMutation.mutate({ id: editingAssignment._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleToggleAutoPunch = (assignment) => {
    toggleAutoPunchMutation.mutate({
      id: assignment._id,
      enabled: !assignment.autoPunchInEnabled
    })
  }

  const columns = [
    {
      header: 'Camera',
      accessor: 'camera',
      cell: (row) => (
        <div className="flex items-center">
          <Camera className="w-4 h-4 mr-2 text-gray-400" />
          <div>
            <div className="font-medium">{row.camera?.name || 'N/A'}</div>
            <div className="text-xs text-gray-500">{row.camera?.type || ''}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Employee',
      accessor: 'employee',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.employee?.firstName} {row.employee?.lastName}</div>
          <div className="text-xs text-gray-500">{row.employee?.employeeId}</div>
        </div>
      )
    },
    {
      header: 'Auto Punch-In',
      accessor: 'autoPunchInEnabled',
      cell: (row) => (
        <button
          onClick={() => handleToggleAutoPunch(row)}
          disabled={toggleAutoPunchMutation.isLoading}
          className="flex items-center"
        >
          {row.autoPunchInEnabled ? (
            <span className="flex items-center text-green-600">
              <ToggleRight className="w-5 h-5 mr-1" />
              <span className="text-sm">Enabled</span>
            </span>
          ) : (
            <span className="flex items-center text-gray-400">
              <ToggleLeft className="w-5 h-5 mr-1" />
              <span className="text-sm">Disabled</span>
            </span>
          )}
        </button>
      )
    },
    {
      header: 'Priority',
      accessor: 'priority',
      cell: (row) => <span className="text-sm">{row.priority || 1}</span>
    },
    {
      header: 'Status',
      accessor: 'isActive',
      cell: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            title="Edit Assignment"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteAssignment(row)}
            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete Assignment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Camera Assignments</h1>
          <p className="text-gray-600 mt-1">Assign cameras to employees for auto punch-in</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            onClick={() => { resetBulkForm(); setShowBulkModal(true); }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Bulk Assign
          </Button>
          <Button onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Assign Camera
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <Select
          label="Filter by Camera"
          value={filterCamera}
          onChange={(e) => setFilterCamera(e.target.value)}
          options={[
            { value: '', label: 'All Cameras' },
            ...(cameras || []).map(camera => ({
              value: camera._id,
              label: camera.name
            }))
          ]}
        />
      </div>

      {/* Assignments Table */}
      <div className="card">
        <Table
          data={assignments || []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No camera assignments found. Assign cameras to employees to enable auto punch-in."
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingAssignment ? 'Edit Camera Assignment' : 'Assign Camera to Employee'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Camera"
            required
            value={formData.cameraId}
            onChange={(e) => setFormData({ ...formData, cameraId: e.target.value })}
            options={[
              { value: '', label: 'Select Camera' },
              ...(cameras || []).filter(c => c.isActive).map(camera => ({
                value: camera._id,
                label: `${camera.name} (${camera.type})`
              }))
            ]}
          />

          <Select
            label="Employee"
            required
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            options={[
              { value: '', label: 'Select Employee' },
              ...(employees || []).filter(emp => emp.status === 'active').map(emp => ({
                value: emp._id,
                label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
              }))
            ]}
          />

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoPunchInEnabled"
              checked={formData.autoPunchInEnabled}
              onChange={(e) => setFormData({ ...formData, autoPunchInEnabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoPunchInEnabled" className="text-sm font-medium text-gray-700">
              Enable Auto Punch-In
            </label>
          </div>

          <Input
            label="Priority (lower number = higher priority)"
            type="number"
            min="1"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
          />

          <Input
            label="Notes (Optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            multiline
            rows={3}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowModal(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isLoading || updateMutation.isLoading}
            >
              {editingAssignment ? 'Update' : 'Assign'} Camera
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteAssignment}
        onClose={() => setDeleteAssignment(null)}
        onConfirm={() => deleteMutation.mutate(deleteAssignment._id)}
        title="Delete Camera Assignment"
        message={`Are you sure you want to remove the assignment between "${deleteAssignment?.camera?.name}" and "${deleteAssignment?.employee?.firstName} ${deleteAssignment?.employee?.lastName}"?`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Bulk Assignment Modal */}
      <Modal
        isOpen={showBulkModal}
        onClose={() => { setShowBulkModal(false); resetBulkForm(); }}
        title="Bulk Assign Camera"
        size="lg"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <Select
            label="Camera"
            required
            value={bulkFormData.cameraId}
            onChange={(e) => setBulkFormData({ ...bulkFormData, cameraId: e.target.value })}
            options={[
              { value: '', label: 'Select Camera' },
              ...(cameras || []).filter(c => c.isActive).map(camera => ({
                value: camera._id,
                label: `${camera.name} (${camera.type})`
              }))
            ]}
          />

          <Select
            label="Assign To"
            required
            value={bulkFormData.scope}
            onChange={(e) => setBulkFormData({ ...bulkFormData, scope: e.target.value, scopeId: '' })}
            options={[
              { value: 'all', label: 'All Employees' },
              { value: 'department', label: 'Department' },
              { value: 'location', label: 'Location/Branch' }
            ]}
          />

          {bulkFormData.scope === 'department' && (
            <Select
              label="Department"
              required
              value={bulkFormData.scopeId}
              onChange={(e) => setBulkFormData({ ...bulkFormData, scopeId: e.target.value })}
              options={[
                { value: '', label: 'Select Department' },
                ...(departments || []).filter(d => d.isActive).map(dept => ({
                  value: dept._id,
                  label: `${dept.name} (${dept.code})`
                }))
              ]}
            />
          )}

          {bulkFormData.scope === 'location' && (
            <Select
              label="Location/Branch"
              required
              value={bulkFormData.scopeId}
              onChange={(e) => setBulkFormData({ ...bulkFormData, scopeId: e.target.value })}
              options={[
                { value: '', label: 'Select Location' },
                ...(branches || []).filter(b => b.isActive).map(branch => ({
                  value: branch._id,
                  label: `${branch.name} (${branch.code})`
                }))
              ]}
            />
          )}

          {/* Employee Count Preview */}
          {bulkFormData.cameraId && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {bulkFormData.scope === 'all' && <><Globe className="w-4 h-4 inline mr-1" />All Employees</>}
                  {bulkFormData.scope === 'department' && <><Building2 className="w-4 h-4 inline mr-1" />Department</>}
                  {bulkFormData.scope === 'location' && <><MapPin className="w-4 h-4 inline mr-1" />Location</>}
                </span>
                <span className="text-sm font-semibold text-blue-700">
                  {getScopeEmployeeCount()} employees will be assigned
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="bulkAutoPunchInEnabled"
              checked={bulkFormData.autoPunchInEnabled}
              onChange={(e) => setBulkFormData({ ...bulkFormData, autoPunchInEnabled: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="bulkAutoPunchInEnabled" className="text-sm font-medium text-gray-700">
              Enable Auto Punch-In for all assignments
            </label>
          </div>

          <Input
            label="Priority (lower number = higher priority)"
            type="number"
            min="1"
            value={bulkFormData.priority}
            onChange={(e) => setBulkFormData({ ...bulkFormData, priority: parseInt(e.target.value) || 1 })}
          />

          <Input
            label="Notes (Optional)"
            value={bulkFormData.notes}
            onChange={(e) => setBulkFormData({ ...bulkFormData, notes: e.target.value })}
            multiline
            rows={3}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowBulkModal(false); resetBulkForm(); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={bulkAssignMutation.isLoading || getScopeEmployeeCount() === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign to {getScopeEmployeeCount()} Employees
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CameraAssignments

