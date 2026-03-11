import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Search, Play, Pause, Lock, CheckCircle, Eye, Calendar, Filter } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import Modal from '../../components/Modal'

const PerformanceCycles = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cycleTypeFilter, setCycleTypeFilter] = useState('')
  const [actionCycle, setActionCycle] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['performanceCycles', search, statusFilter, cycleTypeFilter],
    queryFn: async () => {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (cycleTypeFilter) params.cycleType = cycleTypeFilter
      
      const response = await api.get('/performance-cycles', { params })
      return response.data.data || []
    },
  })

  const activateMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/performance-cycles/${id}/activate`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['performanceCycles'])
      showToast('Performance cycle activated successfully', 'success')
      setShowActionModal(false)
      setActionCycle(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to activate cycle', 'error')
    }
  })

  const freezeMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/performance-cycles/${id}/freeze`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['performanceCycles'])
      showToast('Performance cycle frozen successfully', 'success')
      setShowActionModal(false)
      setActionCycle(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to freeze cycle', 'error')
    }
  })

  const closeMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/performance-cycles/${id}/close`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['performanceCycles'])
      showToast('Performance cycle closed successfully', 'success')
      setShowActionModal(false)
      setActionCycle(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to close cycle', 'error')
    }
  })

  const handleAction = (cycle, type) => {
    setActionCycle(cycle)
    setActionType(type)
    setShowActionModal(true)
  }

  const confirmAction = () => {
    if (!actionCycle) return

    switch (actionType) {
      case 'activate':
        activateMutation.mutate(actionCycle._id)
        break
      case 'freeze':
        freezeMutation.mutate(actionCycle._id)
        break
      case 'close':
        closeMutation.mutate(actionCycle._id)
        break
    }
  }

  const getCycleTypeLabel = (type) => {
    const types = {
      half_yearly: 'Half-Yearly',
      annual: 'Annual',
      quarterly: 'Quarterly'
    }
    return types[type] || type
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      frozen: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const columns = [
    {
      key: 'name',
      header: 'Cycle Name',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            <div className="font-medium text-gray-900">{row.name || '-'}</div>
            <div className="text-xs text-gray-500">{getCycleTypeLabel(row.cycleType) || '-'}</div>
          </div>
        )
      }
    },
    {
      key: 'dates',
      header: 'Period',
      render: (value, row) => {
        if (!row || !row.startDate || !row.endDate) return '-'
        return (
          <div className="text-sm">
            <div>{new Date(row.startDate).toLocaleDateString()}</div>
            <div className="text-gray-500">to {new Date(row.endDate).toLocaleDateString()}</div>
          </div>
        )
      }
    },
    {
      key: 'departments',
      header: 'Departments',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className="text-sm text-gray-600">
            {row.associatedDepartments?.length > 0 
              ? `${row.associatedDepartments.length} dept(s)`
              : 'All Departments'}
          </span>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
            {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : '-'}
          </span>
        )
      }
    },
    {
      key: 'employees',
      header: 'Employees',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className="text-sm text-gray-600">
            {row.employeeInclusion?.includeAllActive 
              ? 'All Active' 
              : `${row.employeeInclusion?.includedEmployees?.length || 0} selected`}
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
            <Link
              to={`/performance/cycles/${row._id}`}
              className="text-primary-600 hover:text-primary-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Link>
            {user?.role === 'admin' && (
              <>
                <Link
                  to={`/performance/cycles/${row._id}/edit`}
                  className="text-gray-600 hover:text-gray-800"
                  title="Edit"
                >
                  Edit
                </Link>
                {row.status === 'draft' && (
                  <button
                    onClick={() => handleAction(row, 'activate')}
                    className="text-green-600 hover:text-green-800"
                    title="Activate"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                {row.status === 'active' && (
                  <>
                    <button
                      onClick={() => handleAction(row, 'freeze')}
                      className="text-yellow-600 hover:text-yellow-800"
                      title="Freeze"
                    >
                      <Pause className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAction(row, 'close')}
                      className="text-blue-600 hover:text-blue-800"
                      title="Close"
                    >
                      <Lock className="h-4 w-4" />
                    </button>
                  </>
                )}
                {row.status === 'frozen' && (
                  <button
                    onClick={() => handleAction(row, 'activate')}
                    className="text-green-600 hover:text-green-800"
                    title="Reactivate"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        )
      }
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Cycles</h1>
          <p className="text-gray-600 mt-1">Configure and manage performance review cycles</p>
        </div>
        {user?.role === 'admin' && (
          <Link to="/performance/cycles/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Cycle
            </Button>
          </Link>
        )}
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by cycle name..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select
            placeholder="All Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'frozen', label: 'Frozen' },
              { value: 'closed', label: 'Closed' }
            ]}
          />
          <Select
            placeholder="All Types"
            value={cycleTypeFilter}
            onChange={(e) => setCycleTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'half_yearly', label: 'Half-Yearly' },
              { value: 'annual', label: 'Annual' }
            ]}
          />
        </div>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={data || []}
          isLoading={isLoading}
          emptyMessage="No performance cycles found"
        />
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false)
          setActionCycle(null)
          setActionType(null)
        }}
        title={
          actionType === 'activate' ? 'Activate Performance Cycle' :
          actionType === 'freeze' ? 'Freeze Performance Cycle' :
          actionType === 'close' ? 'Close Performance Cycle' :
          'Confirm Action'
        }
      >
        {actionCycle && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to {actionType} the performance cycle <strong>{actionCycle.name}</strong>?
            </p>
            {actionType === 'activate' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Activating this cycle will make it active and enable notifications for workflow windows.
                </p>
              </div>
            )}
            {actionType === 'freeze' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Freezing this cycle will pause all activities. You can reactivate it later.
                </p>
              </div>
            )}
            {actionType === 'close' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Closing this cycle will finalize it. This action cannot be undone.
                </p>
              </div>
            )}
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowActionModal(false)
                  setActionCycle(null)
                  setActionType(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                isLoading={
                  activateMutation.isLoading ||
                  freezeMutation.isLoading ||
                  closeMutation.isLoading
                }
                variant={actionType === 'close' ? 'danger' : 'primary'}
              >
                {actionType === 'activate' && 'Activate'}
                {actionType === 'freeze' && 'Freeze'}
                {actionType === 'close' && 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PerformanceCycles

