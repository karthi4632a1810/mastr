import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useEffect, useMemo, useState } from 'react'
import { Plus, Building2, Briefcase, MapPin, Clock, Trash2, Edit, Shield, Lock, Copy } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import ConfirmDialog from '../../components/ConfirmDialog'

const Settings = () => {
  const { showToast } = useToast()
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('departments')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState([])
  const [shiftWeekOffs, setShiftWeekOffs] = useState([])
  const [shiftAutoBreak, setShiftAutoBreak] = useState({ isEnabled: false, thresholdHours: '', durationMinutes: '' })
  const [shiftBreakType, setShiftBreakType] = useState('unpaid')
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')
  const [shiftBreakDuration, setShiftBreakDuration] = useState(0)
  const [computedHours, setComputedHours] = useState(0)

  const computeWorkingHours = (start, end, breakDuration = 0, breakType = 'unpaid') => {
    if (!start || !end) return 0
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    if ([sh, sm, eh, em].some((v) => Number.isNaN(v))) return 0
    let startMinutes = sh * 60 + sm
    let endMinutes = eh * 60 + em
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60
    }
    const diff = endMinutes - startMinutes
    const unpaidBreak = breakType === 'unpaid' ? Number(breakDuration || 0) : 0
    const net = Math.max(diff - unpaidBreak, 0)
    return Number((net / 60).toFixed(2))
  }

  useEffect(() => {
    setComputedHours(computeWorkingHours(shiftStart, shiftEnd, shiftBreakDuration, shiftBreakType))
  }, [shiftStart, shiftEnd, shiftBreakDuration, shiftBreakType])

  useEffect(() => {
    if (activeTab === 'shifts' && showModal) {
      if (editingItem) {
        setShiftWeekOffs(editingItem.weekOffs || [])
        setShiftAutoBreak({
          isEnabled: editingItem.autoBreakDeduction?.isEnabled || false,
          thresholdHours: editingItem.autoBreakDeduction?.thresholdHours ?? '',
          durationMinutes: editingItem.autoBreakDeduction?.durationMinutes ?? ''
        })
        setShiftBreakType(editingItem.breakType || 'unpaid')
        setShiftStart(editingItem.startTime || '')
        setShiftEnd(editingItem.endTime || '')
        setShiftBreakDuration(editingItem.breakDuration || 0)
      } else {
        setShiftWeekOffs([])
        setShiftAutoBreak({ isEnabled: false, thresholdHours: '', durationMinutes: '' })
        setShiftBreakType('unpaid')
        setShiftStart('')
        setShiftEnd('')
        setShiftBreakDuration(0)
      }
    }
  }, [activeTab, showModal, editingItem])

  const { data: departments, isLoading: deptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data
    },
  })

  const { data: designations, isLoading: desgLoading } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const response = await api.get('/designations')
      return response.data
    },
  })

  const { data: branches, isLoading: branchLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/settings/branches')
      return response.data
    },
  })

  const { data: shifts, isLoading: shiftLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await api.get('/shifts')
      return response.data
    },
  })

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/roles')
      return response.data
    },
    enabled: isAdmin
  })

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await api.get('/permissions')
      return response.data
    },
    enabled: isAdmin
  })

  const tabs = [
    { id: 'departments', name: 'Departments', icon: Building2 },
    { id: 'designations', name: 'Designations', icon: Briefcase },
    { id: 'branches', name: 'Branches', icon: MapPin },
  ]

  const departmentMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return api.put(`/departments/${editingItem._id}`, data)
      } else {
        return api.post('/departments', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['departments'])
      setShowModal(false)
      setEditingItem(null)
      showToast(editingItem ? 'Department updated' : 'Department created', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Operation failed', 'error')
    },
  })

  const designationMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return api.put(`/designations/${editingItem._id}`, data)
      } else {
        return api.post('/designations', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['designations'])
      setShowModal(false)
      setEditingItem(null)
      showToast(editingItem ? 'Designation updated' : 'Designation created', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Operation failed', 'error')
    },
  })

  const branchMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return api.put(`/settings/branches/${editingItem._id}`, data)
      } else {
        return api.post('/settings/branches', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branches'])
      setShowModal(false)
      setEditingItem(null)
      showToast(editingItem ? 'Branch updated' : 'Branch created', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Operation failed', 'error')
    },
  })

  const shiftMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return api.put(`/shifts/${editingItem._id}`, data)
      } else {
        return api.post('/shifts', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      setShowModal(false)
      setEditingItem(null)
      showToast(editingItem ? 'Shift updated' : 'Shift created', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Operation failed', 'error')
    },
  })

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id) => api.delete(`/departments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['departments'])
      setDeleteItem(null)
      showToast('Department deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete department', 'error')
    },
  })

  const deleteDesignationMutation = useMutation({
    mutationFn: async (id) => api.delete(`/designations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['designations'])
      setDeleteItem(null)
      showToast('Designation deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete designation', 'error')
    },
  })

  const deleteBranchMutation = useMutation({
    mutationFn: async (id) => api.delete(`/settings/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['branches'])
      setDeleteItem(null)
      showToast('Branch deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete branch', 'error')
    },
  })

  const deleteShiftMutation = useMutation({
    mutationFn: async (id) => api.delete(`/shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      setDeleteItem(null)
      showToast('Shift deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete shift', 'error')
    },
  })

  const cloneShiftMutation = useMutation({
    mutationFn: async ({ id, name, code }) => api.post(`/shifts/${id}/clone`, { name, code }),
    onSuccess: () => {
      queryClient.invalidateQueries(['shifts'])
      showToast('Shift cloned successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to clone shift', 'error')
    },
  })

  const roleMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return api.put(`/roles/${editingItem._id}`, data)
      } else {
        return api.post('/roles', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowModal(false)
      setEditingItem(null)
      showToast(editingItem ? 'Role updated' : 'Role created', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Operation failed', 'error')
    },
  })

  const assignPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissions }) => {
      return api.put(`/roles/${roleId}/permissions`, { permissions })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setShowPermissionsModal(false)
      setSelectedRole(null)
      showToast('Permissions updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update permissions', 'error')
    },
  })

  const deleteRoleMutation = useMutation({
    mutationFn: async (id) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles'])
      setDeleteItem(null)
      showToast('Role deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete role', 'error')
    },
  })

  const handleDelete = () => {
    if (!deleteItem) return

    if (activeTab === 'departments') {
      deleteDepartmentMutation.mutate(deleteItem._id)
    } else if (activeTab === 'designations') {
      deleteDesignationMutation.mutate(deleteItem._id)
    } else if (activeTab === 'branches') {
      deleteBranchMutation.mutate(deleteItem._id)
    } else if (activeTab === 'shifts') {
      deleteShiftMutation.mutate(deleteItem._id)
    } else if (activeTab === 'roles') {
      deleteRoleMutation.mutate(deleteItem._id)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const data = Object.fromEntries(formData.entries())
    
    if (activeTab === 'departments') {
      departmentMutation.mutate({ ...data, isActive: data.isActive === 'true' })
    } else if (activeTab === 'designations') {
      designationMutation.mutate({ ...data, isActive: data.isActive === 'true' })
    } else     if (activeTab === 'branches') {
      branchMutation.mutate({ 
        ...data, 
        address: {
          city: data.city,
          state: data.state,
          street: data.street || '',
          zipCode: data.zipCode || '',
          country: data.country || 'India'
        },
        isActive: data.isActive === 'true' 
      })
    } else if (activeTab === 'shifts') {
      const payload = {
        name: data.name,
        code: data.code,
        category: data.category,
        startTime: shiftStart,
        endTime: shiftEnd,
        breakDuration: Number(shiftBreakDuration) || 0,
        breakType: shiftBreakType,
        workingHours: computedHours,
        isFlexible: data.isFlexible === 'true',
        graceLateMinutes: Number(data.graceLateMinutes) || 0,
        graceEarlyMinutes: Number(data.graceEarlyMinutes) || 0,
        minHoursPresent: Number(data.minHoursPresent) || 0,
        halfDayHours: Number(data.halfDayHours) || 0,
        overtimeEligible: data.overtimeEligible === 'true',
        autoBreakDeduction: {
          isEnabled: shiftAutoBreak.isEnabled,
          thresholdHours: shiftAutoBreak.thresholdHours ? Number(shiftAutoBreak.thresholdHours) : 0,
          durationMinutes: shiftAutoBreak.durationMinutes ? Number(shiftAutoBreak.durationMinutes) : 0
        },
        weekOffs: shiftWeekOffs,
        isActive: data.isActive === 'true'
      }
      shiftMutation.mutate(payload)
    }
  }

  const renderTable = () => {
    if (activeTab === 'departments') {
      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'code', header: 'Code' },
        {
          key: 'status',
          header: 'Status',
          render: (value, row) => {
            if (!row) return '-'
            return (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {row.isActive ? 'Active' : 'Inactive'}
              </span>
            )
          }
        },
        {
          key: 'actions',
          header: 'Actions',
          render: (value, row) => {
            if (!row || !row._id) return '-'
            return (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingItem(row)
                    setShowModal(true)
                  }}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteItem(row)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            )
          }
        },
      ]
      return <Table columns={columns} data={departments?.data || []} isLoading={deptLoading} />
    }

    if (activeTab === 'designations') {
      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'code', header: 'Code' },
        {
          key: 'status',
          header: 'Status',
          render: (value, row) => {
            if (!row) return '-'
            return (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {row.isActive ? 'Active' : 'Inactive'}
              </span>
            )
          }
        },
        {
          key: 'actions',
          header: 'Actions',
          render: (value, row) => {
            if (!row || !row._id) return '-'
            return (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingItem(row)
                    setShowModal(true)
                  }}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteItem(row)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            )
          }
        },
      ]
      return <Table columns={columns} data={designations?.data || []} isLoading={desgLoading} />
    }

    if (activeTab === 'branches') {
      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'code', header: 'Code' },
        { 
          key: 'address', 
          header: 'Address',
          render: (value, row) => {
            if (!row || !row.address) return '-'
            return row.address?.city ? `${row.address.city}, ${row.address.state}` : '-'
          }
        },
        {
          key: 'status',
          header: 'Status',
          render: (value, row) => {
            if (!row) return '-'
            return (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {row.isActive ? 'Active' : 'Inactive'}
              </span>
            )
          }
        },
        {
          key: 'actions',
          header: 'Actions',
          render: (value, row) => {
            if (!row || !row._id) return '-'
            return (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingItem(row)
                    setShowModal(true)
                  }}
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteItem(row)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            )
          }
        },
      ]
      return <Table columns={columns} data={branches?.data || []} isLoading={branchLoading} />
    }

    if (activeTab === 'shifts') {
      const columns = [
        { key: 'name', header: 'Name' },
        { key: 'category', header: 'Category' },
        {
          key: 'timing',
          header: 'Timing',
          render: (value, row) => {
            if (!row) return '-'
            return `${row.startTime || '-'} - ${row.endTime || '-'}`
          }
        },
        {
          key: 'workingHours',
          header: 'Hours',
          render: (value, row) => {
            if (!row) return '-'
            return `${row.workingHours?.toFixed ? row.workingHours.toFixed(2) : row.workingHours || 0}`
          }
        },
        {
          key: 'version',
          header: 'Version',
          render: (value, row) => {
            if (!row) return '-'
            return `v${row.version || 1}`
          }
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {row.isActive ? 'Active' : 'Inactive'}
            </span>
          )
        },
        {
          key: 'actions',
          header: 'Actions',
          render: (row) => (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setEditingItem(row)
                  setShowModal(true)
                }}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
              <button
                onClick={() => {
                  const newName = window.prompt('Name for cloned shift', `${row.name} Copy`) || `${row.name} Copy`
                  const newCode = window.prompt('Code for cloned shift', `${row.code}-COPY`) || `${row.code}-COPY`
                  cloneShiftMutation.mutate({ id: row._id, name: newName, code: newCode })
                }}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              >
                <Copy className="h-4 w-4 mr-1" />
                Clone
              </button>
              <button
                onClick={() => setDeleteItem(row)}
                className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          )
        },
      ]
      return <Table columns={columns} data={shifts?.data || []} isLoading={shiftLoading} />
    }

    if (activeTab === 'roles') {
      const columns = [
        { key: 'name', header: 'Role Name' },
        { key: 'code', header: 'Code' },
        {
          key: 'permissions',
          header: 'Permissions',
          render: (value, row) => {
            if (!row) return '-'
            return (
              <span className="text-sm text-gray-600">
                {row.permissions?.length || 0} permission(s)
              </span>
            )
          }
        },
        {
          key: 'type',
          header: 'Type',
          render: (value, row) => {
            if (!row) return '-'
            return (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                row.isSystemRole 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {row.isSystemRole ? 'System' : 'Custom'}
              </span>
            )
          }
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {row.isActive ? 'Active' : 'Inactive'}
            </span>
          )
        },
        {
          key: 'actions',
          header: 'Actions',
          render: (row) => (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setSelectedRole(row)
                  const rolePermissionIds = row.permissions?.map(p => p._id || p) || []
                  setSelectedPermissions(rolePermissionIds)
                  setShowPermissionsModal(true)
                }}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
                title="Manage Permissions"
              >
                <Lock className="h-4 w-4 mr-1" />
                Permissions
              </button>
              <button
                onClick={() => {
                  setEditingItem(row)
                  setShowModal(true)
                }}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
              {!row.isSystemRole && (
                <button
                  onClick={() => setDeleteItem(row)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              )}
            </div>
          )
        },
      ]
      return <Table columns={columns} data={roles?.data || []} isLoading={rolesLoading} />
    }
  }

  const renderForm = () => {
    const isLoading = departmentMutation.isLoading || designationMutation.isLoading || 
                     branchMutation.isLoading || shiftMutation.isLoading

    if (activeTab === 'departments' || activeTab === 'designations') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              required
              defaultValue={editingItem?.name || ''}
            />
            <Input
              label="Code"
              name="code"
              required
              defaultValue={editingItem?.code || ''}
            />
          </div>
          <Select
            label="Status"
            name="isActive"
            required
            defaultValue={editingItem?.isActive !== undefined ? String(editingItem.isActive) : 'true'}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
          />
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingItem(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      )
    }

    if (activeTab === 'branches') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              required
              defaultValue={editingItem?.name || ''}
            />
            <Input
              label="Code"
              name="code"
              required
              defaultValue={editingItem?.code || ''}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              name="city"
              required
              defaultValue={editingItem?.address?.city || ''}
            />
            <Input
              label="State"
              name="state"
              required
              defaultValue={editingItem?.address?.state || ''}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Street"
              name="street"
              defaultValue={editingItem?.address?.street || ''}
            />
            <Input
              label="ZIP Code"
              name="zipCode"
              defaultValue={editingItem?.address?.zipCode || ''}
            />
          </div>
          <Select
            label="Status"
            name="isActive"
            required
            defaultValue={editingItem?.isActive !== undefined ? String(editingItem.isActive) : 'true'}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
          />
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingItem(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      )
    }

    if (activeTab === 'shifts') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            name="name"
            required
            defaultValue={editingItem?.name || ''}
          />
          <Input
            label="Code"
            name="code"
            required
            defaultValue={editingItem?.code || ''}
            placeholder="e.g., MORNING"
          />
          <Select
            label="Category"
            name="category"
            defaultValue={editingItem?.category || 'regular'}
            options={[
              { value: 'regular', label: 'Regular' },
              { value: 'night', label: 'Night' },
              { value: 'rotational', label: 'Rotational' },
              { value: 'weekend', label: 'Weekend' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              name="startTime"
              type="time"
              required
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
            />
            <Input
              label="End Time"
              name="endTime"
              type="time"
              required
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Break Duration (mins)"
              name="breakDuration"
              type="number"
              min="0"
              value={shiftBreakDuration}
              onChange={(e) => setShiftBreakDuration(e.target.value)}
            />
            <Select
              label="Break Type"
              name="breakType"
              value={shiftBreakType}
              onChange={(e) => setShiftBreakType(e.target.value)}
              options={[
                { value: 'unpaid', label: 'Unpaid' },
                { value: 'paid', label: 'Paid' }
              ]}
            />
            <Input
              label="Working Hours (auto)"
              name="workingHours"
              value={computedHours}
              readOnly
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Grace Late (mins)"
              name="graceLateMinutes"
              type="number"
              min="0"
              defaultValue={editingItem?.graceLateMinutes ?? 10}
            />
            <Input
              label="Grace Early Out (mins)"
              name="graceEarlyMinutes"
              type="number"
              min="0"
              defaultValue={editingItem?.graceEarlyMinutes ?? 10}
            />
            <Select
              label="Flexible?"
              name="isFlexible"
              defaultValue={editingItem?.isFlexible !== undefined ? String(editingItem.isFlexible) : 'false'}
              options={[
                { value: 'false', label: 'No' },
                { value: 'true', label: 'Yes' }
              ]}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Min Hours for Present"
              name="minHoursPresent"
              type="number"
              step="0.25"
              min="0"
              defaultValue={editingItem?.minHoursPresent ?? 8}
            />
            <Input
              label="Half-Day Hours"
              name="halfDayHours"
              type="number"
              step="0.25"
              min="0"
              defaultValue={editingItem?.halfDayHours ?? 4}
            />
            <Select
              label="Overtime Eligible"
              name="overtimeEligible"
              defaultValue={editingItem?.overtimeEligible !== undefined ? String(editingItem.overtimeEligible) : 'false'}
              options={[
                { value: 'true', label: 'Yes' },
                { value: 'false', label: 'No' }
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">Auto Break Deduction</span>
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={shiftAutoBreak.isEnabled}
                    onChange={(e) => setShiftAutoBreak(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Enable</span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Threshold Hours"
                  name="autoBreakThreshold"
                  type="number"
                  step="0.25"
                  min="0"
                  value={shiftAutoBreak.thresholdHours}
                  onChange={(e) => setShiftAutoBreak(prev => ({ ...prev, thresholdHours: e.target.value }))}
                  disabled={!shiftAutoBreak.isEnabled}
                />
                <Input
                  label="Deduct (mins)"
                  name="autoBreakDuration"
                  type="number"
                  min="0"
                  value={shiftAutoBreak.durationMinutes}
                  onChange={(e) => setShiftAutoBreak(prev => ({ ...prev, durationMinutes: e.target.value }))}
                  disabled={!shiftAutoBreak.isEnabled}
                />
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <span className="text-sm font-medium text-gray-800">Week-offs</span>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day, idx) => (
                  <label key={day} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={shiftWeekOffs.includes(idx)}
                      onChange={(e) => {
                        setShiftWeekOffs(prev => 
                          e.target.checked 
                            ? [...new Set([...prev, idx])]
                            : prev.filter(v => v !== idx)
                        )
                      }}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <Select
            label="Status"
            name="isActive"
            required
            defaultValue={editingItem?.isActive !== undefined ? String(editingItem.isActive) : 'true'}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
          />
          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingItem(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      )
    }

    if (activeTab === 'roles') {
      return (
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.target)
          const data = {
            name: formData.get('name'),
            code: formData.get('code'),
            description: formData.get('description') || '',
            isActive: formData.get('isActive') === 'true'
          }
          roleMutation.mutate(data)
        }} className="space-y-4">
          <Input
            label="Role Name"
            name="name"
            required
            defaultValue={editingItem?.name || ''}
          />
          <Input
            label="Code"
            name="code"
            required
            defaultValue={editingItem?.code || ''}
            placeholder="e.g., MANAGER"
          />
          <Input
            label="Description"
            name="description"
            defaultValue={editingItem?.description || ''}
          />
          <Select
            label="Status"
            name="isActive"
            required
            defaultValue={editingItem?.isActive !== undefined ? String(editingItem.isActive) : 'true'}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' }
            ]}
          />
          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingItem(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={roleMutation.isLoading}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      )
    }
  }

  const renderPermissionsModal = () => {
    if (!selectedRole || !permissions?.data) return null

    const rolePermissionIds = selectedRole.permissions?.map(p => p._id || p) || []
    const permissionsByModule = {}
    
    permissions.data.forEach(perm => {
      if (!permissionsByModule[perm.module]) {
        permissionsByModule[perm.module] = []
      }
      permissionsByModule[perm.module].push(perm)
    })

    // Initialize selected permissions when role changes
    if (selectedPermissions.length === 0 && rolePermissionIds.length > 0) {
      setSelectedPermissions(rolePermissionIds)
    }

    const handlePermissionToggle = (permissionId) => {
      setSelectedPermissions(prev => 
        prev.includes(permissionId)
          ? prev.filter(id => id !== permissionId)
          : [...prev, permissionId]
      )
    }

    const handleSelectAll = (module) => {
      const modulePerms = permissionsByModule[module].map(p => p._id)
      const allSelected = modulePerms.every(id => selectedPermissions.includes(id))
      
      if (allSelected) {
        setSelectedPermissions(prev => prev.filter(id => !modulePerms.includes(id)))
      } else {
        setSelectedPermissions(prev => [...new Set([...prev, ...modulePerms])])
      }
    }

    const handleSave = () => {
      assignPermissionsMutation.mutate({
        roleId: selectedRole._id,
        permissions: selectedPermissions
      })
    }

    return (
      <div className="max-h-[70vh] overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Manage Permissions for: {selectedRole.name}
          </h3>
          <p className="text-sm text-gray-600">
            Select the permissions this role should have access to
          </p>
        </div>

        <div className="space-y-6">
          {Object.entries(permissionsByModule).map(([module, modulePerms]) => {
            const moduleSelected = modulePerms.every(p => selectedPermissions.includes(p._id))
            const modulePartial = modulePerms.some(p => selectedPermissions.includes(p._id)) && !moduleSelected

            return (
              <div key={module} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 capitalize">{module}</h4>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(module)}
                    className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                  >
                    {moduleSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {modulePerms.map(perm => (
                    <label
                      key={perm._id}
                      className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm._id)}
                        onChange={() => handlePermissionToggle(perm._id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {perm.action}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end space-x-4 pt-6 border-t mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowPermissionsModal(false)
              setSelectedRole(null)
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            isLoading={assignPermissionsMutation.isLoading}
          >
            Save Permissions
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage organization settings</p>
        </div>
        <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Add {tabs.find(t => t.id === activeTab)?.name.slice(0, -1)}
        </Button>
      </div>

      <div className="card">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {renderTable()}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingItem(null) }}
        title={`${editingItem ? 'Edit' : 'Add'} ${tabs.find(t => t.id === activeTab)?.name.slice(0, -1)}`}
        size="md"
      >
        {renderForm()}
      </Modal>

      <Modal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false)
          setSelectedRole(null)
          setSelectedPermissions([])
        }}
        title="Manage Permissions"
        size="lg"
      >
        {renderPermissionsModal()}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title={`Delete ${tabs.find(t => t.id === activeTab)?.name.slice(0, -1)}`}
        message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

export default Settings
