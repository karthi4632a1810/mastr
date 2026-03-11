import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Search, CheckCircle, XCircle, Edit, Eye, Lock, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import Modal from '../../components/Modal'

const Goals = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [performanceCycleFilter, setPerformanceCycleFilter] = useState('')
  const [actionGoal, setActionGoal] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const isEmployee = user?.role === 'employee'

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals', search, statusFilter, categoryFilter, performanceCycleFilter],
    queryFn: async () => {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (categoryFilter) params.category = categoryFilter
      if (performanceCycleFilter) params.performanceCycleId = performanceCycleFilter
      
      const response = await api.get('/goals', { params })
      return response.data.data || []
    },
  })

  // Only fetch cycles for admin/hr (employees don't need the cycle filter)
  const { data: cycles } = useQuery({
    queryKey: ['performanceCycles', 'active'],
    queryFn: async () => {
      const response = await api.get('/performance-cycles', { params: { status: 'active' } })
      return response.data.data || []
    },
    enabled: !isEmployee, // Only fetch for admin/hr
  })

  const approveMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/goals/${id}/approve`)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['goals'])
      const warning = data.warning
      showToast(warning ? `${data.message}. ${warning}` : data.message, warning ? 'warning' : 'success')
      setShowActionModal(false)
      setActionGoal(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to approve goal', 'error')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      const response = await api.put(`/goals/${id}/reject`, { reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals'])
      showToast('Goal rejected successfully', 'success')
      setShowActionModal(false)
      setActionGoal(null)
      setRejectionReason('')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to reject goal', 'error')
    }
  })

  const reopenMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/goals/${id}/reopen`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals'])
      showToast('Goal reopened successfully', 'success')
      setShowActionModal(false)
      setActionGoal(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to reopen goal', 'error')
    }
  })

  const handleAction = (goal, type) => {
    setActionGoal(goal)
    setActionType(type)
    setRejectionReason('')
    setShowActionModal(true)
  }

  const confirmAction = () => {
    if (!actionGoal) return

    switch (actionType) {
      case 'approve':
        approveMutation.mutate(actionGoal._id)
        break
      case 'reject':
        if (!rejectionReason.trim()) {
          showToast('Please provide a rejection reason', 'error')
          return
        }
        rejectMutation.mutate({ id: actionGoal._id, reason: rejectionReason })
        break
      case 'reopen':
        reopenMutation.mutate(actionGoal._id)
        break
    }
  }

  const getCategoryLabel = (category) => {
    const categories = {
      productivity: 'Productivity',
      leadership: 'Leadership',
      behavioural: 'Behavioural',
      technical: 'Technical'
    }
    return categories[category] || category
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending_approval: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      reopened: 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const columns = [
    {
      key: 'title',
      header: 'Goal Title',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            <div className="font-medium text-gray-900">{row.title}</div>
            {row.isMandatory && (
              <span className="text-xs text-red-600">Required</span>
            )}
          </div>
        )
      }
    },
    // Only show employee column for admin/hr
    ...(isEmployee ? [] : [{
      key: 'employee',
      header: 'Employee',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            <div className="font-medium text-gray-900">
              {row.employee?.firstName} {row.employee?.lastName}
            </div>
            <div className="text-xs text-gray-500">{row.employee?.employeeId}</div>
          </div>
        )
      }
    }]),
    {
      key: 'category',
      header: 'Category',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className="text-sm text-gray-600">
            {getCategoryLabel(row.category)}
          </span>
        )
      }
    },
    {
      key: 'weightage',
      header: 'Weightage',
      render: (value, row) => {
        if (!row) return '-'
        const weightage = row.weightage || value || 0
        return <span className="font-medium text-gray-900">{weightage}%</span>
      }
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (value, row) => {
        if (!row) return '-'
        const dueDate = row.dueDate || value
        if (!dueDate) return '-'
        try {
          return (
            <span className="text-sm text-gray-600">
              {new Date(dueDate).toLocaleDateString()}
            </span>
          )
        } catch (error) {
          return '-'
        }
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (!row) return '-'
        const status = row.status || value
        if (!status) return '-'
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status?.replace('_', ' ') || '-'}
          </span>
        )
      }
    },
    // Only show proposed by column for admin/hr
    ...(isEmployee ? [] : [{
      key: 'proposedBy',
      header: 'Proposed By',
      render: (value, row) => {
        if (!row) return '-'
        return <span className="text-xs text-gray-600 capitalize">{row.proposedBy || value || '-'}</span>
      }
    }]),
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => {
        if (!row || !row._id) return '-'
        return (
          <div className="flex items-center space-x-2">
            <Link
              to={`/performance/goals/${row._id}`}
              className="text-primary-600 hover:text-primary-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Link>
            {(user?.role === 'admin' || user?.role === 'hr') && (
              <>
                {(row.status === 'pending_approval' || row.status === 'draft') && (
                  <>
                    <button
                      onClick={() => handleAction(row, 'approve')}
                      className="text-green-600 hover:text-green-800 active:text-green-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Approve"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleAction(row, 'reject')}
                      className="text-red-600 hover:text-red-800 active:text-red-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Reject"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </>
                )}
                {row.status === 'approved' && (
                  <button
                    onClick={() => handleAction(row, 'reopen')}
                    className="text-blue-600 hover:text-blue-800 active:text-blue-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title="Reopen"
                  >
                    <Lock className="h-4 w-4" />
                  </button>
                )}
                {(row.status === 'draft' || row.status === 'reopened') && (
                  <Link
                    to={`/performance/goals/${row._id}/edit`}
                    className="text-gray-600 hover:text-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Link>
              )}
            </>
          )}
            {user?.role === 'employee' && (row.status === 'draft' || row.status === 'reopened' || (row.proposedBy === 'employee' && row.status === 'pending_approval')) && (
              <Link
                to={`/performance/goals/${row._id}/edit`}
                className="text-gray-600 hover:text-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Link>
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
          <h1 className="text-3xl font-bold text-gray-900">{isEmployee ? 'My Goals' : 'Goals / KRAs'}</h1>
          <p className="text-gray-600 mt-1">
            {isEmployee 
              ? 'View and manage your performance goals and key result areas' 
              : 'Manage and approve employee goals and key result areas'}
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'employee') && (
          <Link to="/performance/goals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {user?.role === 'employee' ? 'Propose Goal' : 'Create Goal'}
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
                placeholder="Search by goal title or description..."
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
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'reopened', label: 'Reopened' }
            ]}
          />
          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'productivity', label: 'Productivity' },
              { value: 'leadership', label: 'Leadership' },
              { value: 'behavioural', label: 'Behavioural' },
              { value: 'technical', label: 'Technical' }
            ]}
          />
        </div>
        {(user?.role === 'admin' || user?.role === 'hr') && cycles && cycles.length > 0 && (
          <div className="mt-4">
            <Select
              placeholder="All Performance Cycles"
              value={performanceCycleFilter}
              onChange={(e) => setPerformanceCycleFilter(e.target.value)}
              options={[
                { value: '', label: 'All Performance Cycles' },
                ...cycles.map(cycle => ({
                  value: cycle._id,
                  label: cycle.name
                }))
              ]}
            />
          </div>
        )}
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={goals || []}
          isLoading={isLoading}
          emptyMessage={isEmployee ? "You don't have any goals yet. Propose a goal to get started!" : "No goals found"}
        />
      </div>

      {/* Action Modal */}
      <Modal
        isOpen={showActionModal}
        onClose={() => {
          setShowActionModal(false)
          setActionGoal(null)
          setActionType(null)
          setRejectionReason('')
        }}
        title={
          actionType === 'approve' ? 'Approve Goal' :
          actionType === 'reject' ? 'Reject Goal' :
          actionType === 'reopen' ? 'Reopen Goal' :
          'Confirm Action'
        }
      >
        {actionGoal && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{actionGoal.title}</h3>
              <p className="text-sm text-gray-600">
                Employee: {actionGoal.employee?.firstName} {actionGoal.employee?.lastName}
              </p>
            </div>

            {actionType === 'approve' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Approving this goal will make it visible to the employee. Make sure the total weightage for this employee's goals equals 100%.
                </p>
              </div>
            )}

            {actionType === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="input"
                  placeholder="Please provide a reason for rejecting this goal..."
                  required
                />
              </div>
            )}

            {actionType === 'reopen' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Reopening this goal will allow it to be edited again. The employee will be notified.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowActionModal(false)
                  setActionGoal(null)
                  setActionType(null)
                  setRejectionReason('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmAction}
                isLoading={
                  approveMutation.isLoading ||
                  rejectMutation.isLoading ||
                  reopenMutation.isLoading
                }
                disabled={actionType === 'reject' && !rejectionReason.trim()}
                variant={actionType === 'reject' ? 'danger' : 'primary'}
              >
                {actionType === 'approve' && 'Approve'}
                {actionType === 'reject' && 'Reject'}
                {actionType === 'reopen' && 'Reopen'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Goals

