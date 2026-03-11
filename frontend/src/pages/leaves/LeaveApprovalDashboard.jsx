import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Calendar,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  MessageSquare,
  Eye,
  Check,
  X as XIcon
} from 'lucide-react'
import { useState, useMemo } from 'react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Select from '../../components/Select'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'

const LeaveApprovalDashboard = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  
  // State
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [selectedRequests, setSelectedRequests] = useState(new Set())
  const [detailModal, setDetailModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [infoModal, setInfoModal] = useState(null)
  const [filterDepartment, setFilterDepartment] = useState('')
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date())
  const [bulkRemarks, setBulkRemarks] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  // Fetch pending approvals with context
  const { data: approvalsData, isLoading } = useQuery({
    queryKey: ['pending-approvals', filterDepartment],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterDepartment) params.append('departmentId', filterDepartment)
      const response = await api.get(`/leaves/approvals?${params.toString()}`)
      return response.data
    }
  })

  // Fetch departments for filter
  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data?.data || []
    }
  })

  // Fetch team calendar
  const { data: calendarData } = useQuery({
    queryKey: ['team-leave-calendar', currentCalendarMonth.getMonth() + 1, currentCalendarMonth.getFullYear(), filterDepartment],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: currentCalendarMonth.getMonth() + 1,
        year: currentCalendarMonth.getFullYear()
      })
      if (filterDepartment) params.append('departmentId', filterDepartment)
      const response = await api.get(`/leaves/team-calendar?${params.toString()}`)
      return response.data?.data || []
    }
  })

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ id, remarks }) => {
      return api.put(`/leaves/requests/${id}/status`, { 
        status: 'approved',
        approvalRemarks: remarks 
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-approvals'])
      queryClient.invalidateQueries(['team-leave-calendar'])
      setDetailModal(null)
      showToast('Leave request approved successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to approve', 'error')
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      return api.put(`/leaves/requests/${id}/status`, { 
        status: 'rejected',
        rejectionReason: reason 
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-approvals'])
      setRejectModal(null)
      setRejectionReason('')
      showToast('Leave request rejected', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to reject', 'error')
    }
  })

  const requestInfoMutation = useMutation({
    mutationFn: async ({ id, message }) => {
      return api.put(`/leaves/requests/${id}/request-info`, { message })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-approvals'])
      setInfoModal(null)
      setInfoMessage('')
      showToast('Information requested from employee', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to request info', 'error')
    }
  })

  const bulkApproveMutation = useMutation({
    mutationFn: async (requestIds) => {
      return api.post('/leaves/bulk-approve', { 
        requestIds: Array.from(requestIds),
        approvalRemarks: bulkRemarks || 'Bulk approved'
      })
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['pending-approvals'])
      queryClient.invalidateQueries(['team-leave-calendar'])
      setSelectedRequests(new Set())
      setBulkRemarks('')
      const { approved, failed } = response.data.data
      showToast(`${approved.length} approved, ${failed.length} failed`, 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Bulk approval failed', 'error')
    }
  })

  const pendingApprovals = approvalsData?.data || []
  const summary = approvalsData?.summary || { totalPending: 0, overdue: 0, withConflicts: 0 }
  const departments = departmentsData || []

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedRequests)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRequests(newSelected)
  }

  const selectAll = () => {
    if (selectedRequests.size === pendingApprovals.length) {
      setSelectedRequests(new Set())
    } else {
      setSelectedRequests(new Set(pendingApprovals.map(r => r._id)))
    }
  }

  const formatDate = (date) => new Date(date).toLocaleDateString()
  const formatDateTime = (date) => new Date(date).toLocaleString()

  // Calendar cells calculation
  const calendarCells = useMemo(() => {
    if (!calendarData) return []
    
    const firstDayOfMonth = new Date(
      currentCalendarMonth.getFullYear(), 
      currentCalendarMonth.getMonth(), 
      1
    ).getDay()
    
    const cells = []
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(null)
    }
    
    calendarData.forEach(day => {
      cells.push(day)
    })
    
    return cells
  }, [calendarData, currentCalendarMonth])

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Leave Approval Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">Review and manage pending leave requests</p>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="card mb-6 shadow-md hover:shadow-lg transition-shadow duration-200 border-t-4 border-t-primary-500">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <Filter className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <Select
              label="Filter by Department"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              options={[
                { value: '', label: 'All Departments' },
                ...departments.map(d => ({ value: d._id, label: d.name }))
              ]}
            />
          </div>
          {filterDepartment && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilterDepartment('')}
              className="mt-6"
            >
              Clear Filter
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Pending Requests</p>
              <p className="text-3xl font-bold text-amber-900">{summary.totalPending}</p>
            </div>
            <Clock className="h-10 w-10 text-amber-500" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Overdue ({'>'}3 days)</p>
              <p className="text-3xl font-bold text-red-900">{summary.overdue}</p>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">With Conflicts</p>
              <p className="text-3xl font-bold text-purple-900">{summary.withConflicts}</p>
            </div>
            <Users className="h-10 w-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRequests.size > 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-medium text-blue-800">
                {selectedRequests.size} request(s) selected
              </span>
              <input
                type="text"
                placeholder="Add bulk remarks (optional)"
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                className="input w-64"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => bulkApproveMutation.mutate(selectedRequests)}
                isLoading={bulkApproveMutation.isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Bulk Approve
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSelectedRequests(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests Table */}
      <div className="card shadow-md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 uppercase">Pending Requests</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={selectAll}
              className="text-sm text-primary-600 hover:text-primary-800"
            >
              {selectedRequests.size === pendingApprovals.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading pending approvals..." />
        ) : pendingApprovals.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No pending leave requests"
            message="All leave requests have been processed."
          />
        ) : (
          <div className="space-y-3">
            {pendingApprovals.map((request) => (
              <div 
                key={request._id} 
                className={`border rounded-lg transition-all ${
                  request.isOverdue ? 'border-red-300 bg-red-50/50' : 
                  request.conflicts?.length > 0 ? 'border-amber-300 bg-amber-50/50' : 
                  'border-gray-200 bg-white'
                }`}
              >
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedRequests.has(request._id)}
                      onChange={() => toggleSelect(request._id)}
                      className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300"
                    />
                    
                    {/* Employee Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {request.employee?.firstName} {request.employee?.lastName}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({request.employee?.employeeId})
                        </span>
                        {request.employee?.department?.name && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {request.employee.department.name}
                          </span>
                        )}
                        {request.isOverdue && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                            Overdue ({request.daysPending} days)
                          </span>
                        )}
                        {request.status === 'info_requested' && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                            Info Requested
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{request.leaveType?.name}</span>
                        </div>
                        <div>
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </div>
                        <div className="font-medium text-primary-600">
                          {request.days} day(s)
                        </div>
                      </div>

                      {/* Conflicts Warning */}
                      {request.conflicts?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {request.conflicts.map((conflict, idx) => (
                            <div 
                              key={idx}
                              className={`text-xs px-2 py-1 rounded border ${getSeverityColor(conflict.severity)}`}
                            >
                              <AlertTriangle className="h-3 w-3 inline mr-1" />
                              {conflict.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(request._id)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="View Details"
                      >
                        {expandedRows.has(request._id) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => approveMutation.mutate({ id: request._id })}
                        className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                        title="Approve"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setRejectModal(request)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        title="Reject"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setInfoModal(request)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                        title="Request More Info"
                      >
                        <MessageSquare className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRows.has(request._id) && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Leave Balance */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Leave Balance
                        </h4>
                        <div className="space-y-2">
                          {request.leaveBalance?.map((balance) => (
                            <div 
                              key={balance.leaveType._id}
                              className={`flex justify-between text-sm p-2 rounded ${
                                balance.leaveType._id === request.leaveType?._id 
                                  ? 'bg-primary-100 border border-primary-200' 
                                  : 'bg-white border border-gray-200'
                              }`}
                            >
                              <span>{balance.leaveType.name}</span>
                              <span className="font-medium">
                                {balance.available} / {balance.total} available
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Overlapping Team Leaves */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Team Leaves (Same Period)
                        </h4>
                        {request.overlappingTeamLeaves?.length > 0 ? (
                          <div className="space-y-2">
                            {request.overlappingTeamLeaves.map((leave) => (
                              <div key={leave._id} className="text-sm bg-white p-2 rounded border border-gray-200">
                                <div className="flex justify-between">
                                  <span className="font-medium">
                                    {leave.employee?.firstName} {leave.employee?.lastName}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    leave.status === 'approved' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {leave.status}
                                  </span>
                                </div>
                                <div className="text-gray-500 text-xs mt-1">
                                  {leave.leaveType?.name} • {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No overlapping team leaves</p>
                        )}
                      </div>

                      {/* Shift Schedule & Documents */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Shift Schedule
                        </h4>
                        {request.shiftSchedule?.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {request.shiftSchedule.map((schedule, idx) => (
                              <div key={idx} className="text-sm bg-white p-2 rounded border border-gray-200 flex justify-between">
                                <span>{formatDate(schedule.date)}</span>
                                <span className="text-gray-600">{schedule.shift?.name || 'Default'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No shift assignments</p>
                        )}

                        {/* Supporting Document */}
                        {request.supportingDocument && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Supporting Document
                            </h4>
                            <a 
                              href={request.supportingDocument} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" />
                              View Document
                            </a>
                          </div>
                        )}

                        {/* Info Request History */}
                        {request.infoRequests?.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Info Requests
                            </h4>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {request.infoRequests.map((ir, idx) => (
                                <div key={idx} className="text-sm bg-white p-2 rounded border border-gray-200">
                                  <div className="text-gray-600">{ir.message}</div>
                                  {ir.response && (
                                    <div className="mt-1 text-primary-700 bg-primary-50 p-1 rounded">
                                      Response: {ir.response}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-400 mt-1">
                                    {formatDateTime(ir.requestedAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-medium text-gray-900 mb-1">Reason for Leave</h4>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                        {request.reason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Leave Calendar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Leave Calendar</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() - 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-medium min-w-32 text-center">
              {currentCalendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button 
              onClick={() => setCurrentCalendarMonth(new Date(currentCalendarMonth.getFullYear(), currentCalendarMonth.getMonth() + 1))}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {calendarCells.map((cell, idx) => (
            <div 
              key={idx} 
              className={`min-h-20 p-1 border rounded ${
                cell ? 'bg-white' : 'bg-gray-50'
              } ${cell?.dayOfWeek === 0 || cell?.dayOfWeek === 6 ? 'bg-gray-100' : ''}`}
            >
              {cell && (
                <>
                  <div className="text-sm font-medium text-gray-700">
                    {new Date(cell.date).getDate()}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {cell.leaves?.slice(0, 2).map((leave, lidx) => (
                      <div 
                        key={lidx}
                        className={`text-xs truncate px-1 py-0.5 rounded ${
                          leave.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                        title={`${leave.employee?.firstName} - ${leave.leaveType?.name}`}
                      >
                        {leave.employee?.firstName?.charAt(0)}{leave.employee?.lastName?.charAt(0)}
                      </div>
                    ))}
                    {cell.leaves?.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{cell.leaves.length - 2} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
            <span className="text-gray-600">Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></span>
            <span className="text-gray-600">Pending</span>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectModal}
        onClose={() => { setRejectModal(null); setRejectionReason('') }}
        title="Reject Leave Request"
      >
        <div className="space-y-4">
          {rejectModal && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium">
                {rejectModal.employee?.firstName} {rejectModal.employee?.lastName}
              </p>
              <p className="text-sm text-gray-600">
                {rejectModal.leaveType?.name} • {formatDate(rejectModal.startDate)} - {formatDate(rejectModal.endDate)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="input"
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setRejectModal(null); setRejectionReason('') }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => rejectMutation.mutate({ id: rejectModal._id, reason: rejectionReason })}
              isLoading={rejectMutation.isLoading}
              disabled={!rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>

      {/* Request Info Modal */}
      <Modal
        isOpen={!!infoModal}
        onClose={() => { setInfoModal(null); setInfoMessage('') }}
        title="Request More Information"
      >
        <div className="space-y-4">
          {infoModal && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium">
                {infoModal.employee?.firstName} {infoModal.employee?.lastName}
              </p>
              <p className="text-sm text-gray-600">
                {infoModal.leaveType?.name} • {formatDate(infoModal.startDate)} - {formatDate(infoModal.endDate)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message to Employee <span className="text-red-500">*</span>
            </label>
            <textarea
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="What additional information do you need?"
              className="input"
              rows={4}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => { setInfoModal(null); setInfoMessage('') }}>
              Cancel
            </Button>
            <Button
              onClick={() => requestInfoMutation.mutate({ id: infoModal._id, message: infoMessage })}
              isLoading={requestInfoMutation.isLoading}
              disabled={!infoMessage.trim()}
            >
              Send Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default LeaveApprovalDashboard

