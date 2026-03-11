import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { 
  CheckCircle, Clock, AlertCircle, FileText, User, Calendar, 
  TrendingUp, Eye, CheckCircle2, XCircle, Edit, MessageSquare,
  UserCheck, CalendarDays, ArrowRight, Filter
} from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'

const HROnboardingDashboard = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [actionType, setActionType] = useState(null) // 'approve', 'reject', 'reassign', 'extend', 'complete', 'comment'
  const [formData, setFormData] = useState({})

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['onboardingDashboard'],
    queryFn: async () => {
      const response = await api.get('/onboarding/dashboard')
      return response.data.data
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const approveMutation = useMutation({
    mutationFn: async ({ instanceId, taskIndex, approved, reason }) => {
      const response = await api.put(`/onboarding/instances/${instanceId}/tasks/${taskIndex}/approve`, {
        approved,
        reason
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingDashboard'])
      showToast('Task updated successfully', 'success')
      setShowTaskModal(false)
      setSelectedTask(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update task', 'error')
    }
  })

  const reassignMutation = useMutation({
    mutationFn: async ({ instanceId, taskIndex, newResponsibleRole, newAssignedTo }) => {
      const response = await api.put(`/onboarding/instances/${instanceId}/tasks/${taskIndex}/reassign`, {
        newResponsibleRole,
        newAssignedTo
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingDashboard'])
      showToast('Task reassigned successfully', 'success')
      setShowTaskModal(false)
      setSelectedTask(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to reassign task', 'error')
    }
  })

  const extendDueDateMutation = useMutation({
    mutationFn: async ({ instanceId, taskIndex, newDueDate, reason }) => {
      const response = await api.put(`/onboarding/instances/${instanceId}/tasks/${taskIndex}/extend-due-date`, {
        newDueDate,
        reason
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingDashboard'])
      showToast('Due date extended successfully', 'success')
      setShowTaskModal(false)
      setSelectedTask(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to extend due date', 'error')
    }
  })

  const manuallyCompleteMutation = useMutation({
    mutationFn: async ({ instanceId, taskIndex, comments }) => {
      const response = await api.put(`/onboarding/instances/${instanceId}/tasks/${taskIndex}/manually-complete`, {
        comments
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingDashboard'])
      showToast('Task marked as completed', 'success')
      setShowTaskModal(false)
      setSelectedTask(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to complete task', 'error')
    }
  })

  const addCommentMutation = useMutation({
    mutationFn: async ({ instanceId, taskIndex, comment }) => {
      const response = await api.put(`/onboarding/instances/${instanceId}/tasks/${taskIndex}/comment`, {
        comment
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingDashboard'])
      showToast('Comment added successfully', 'success')
      setShowTaskModal(false)
      setSelectedTask(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to add comment', 'error')
    }
  })

  const handleTaskAction = (employee, task, action) => {
    setSelectedEmployee(employee)
    setSelectedTask(task)
    setActionType(action)
    setFormData({})
    setShowTaskModal(true)
  }

  const handleSubmit = () => {
    if (!selectedTask || !selectedEmployee) return

    const instanceId = selectedEmployee.instance._id
    const taskIndex = selectedTask.index

    switch (actionType) {
      case 'approve':
        approveMutation.mutate({
          instanceId,
          taskIndex,
          approved: true,
          reason: formData.reason
        })
        break
      case 'reject':
        approveMutation.mutate({
          instanceId,
          taskIndex,
          approved: false,
          reason: formData.reason
        })
        break
      case 'reassign':
        reassignMutation.mutate({
          instanceId,
          taskIndex,
          newResponsibleRole: formData.newResponsibleRole,
          newAssignedTo: formData.newAssignedTo
        })
        break
      case 'extend':
        extendDueDateMutation.mutate({
          instanceId,
          taskIndex,
          newDueDate: formData.newDueDate,
          reason: formData.reason
        })
        break
      case 'complete':
        manuallyCompleteMutation.mutate({
          instanceId,
          taskIndex,
          comments: formData.comments
        })
        break
      case 'comment':
        addCommentMutation.mutate({
          instanceId,
          taskIndex,
          comment: formData.comment
        })
        break
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const { overall, employees } = dashboardData || { overall: {}, employees: [] }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Onboarding Progress Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor and manage employee onboarding progress</p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{overall.totalEmployees || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{overall.totalTasks || 0}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{overall.completedTasks || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600">{overall.pendingApprovalTasks || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{overall.overdueTasks || 0}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Employee Onboarding Status</h2>
        
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No active onboarding processes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employeeData, idx) => {
              const { instance, statistics, tasks } = employeeData
              const pendingApproval = tasks.filter(t => t.status === 'pending_approval')
              const overdue = tasks.filter(t => t.isOverdue)

              return (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {instance.employee?.firstName} {instance.employee?.lastName}
                        </h3>
                        <span className="text-sm text-gray-500">
                          ({instance.employee?.employeeId})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span>Department: {instance.employee?.department?.name || 'N/A'}</span>
                        <span>Designation: {instance.employee?.designation?.name || 'N/A'}</span>
                        <span>Joining: {new Date(instance.joiningDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary-600">{statistics.progress}%</div>
                      <div className="text-sm text-gray-600">Complete</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${statistics.progress}%` }}
                    />
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">{statistics.totalTasks}</div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{statistics.completedTasks}</div>
                      <div className="text-xs text-gray-600">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-600">{statistics.pendingApprovalTasks}</div>
                      <div className="text-xs text-gray-600">Pending Approval</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{statistics.overdueTasks}</div>
                      <div className="text-xs text-gray-600">Overdue</div>
                    </div>
                  </div>

                  {/* Tasks Requiring Attention */}
                  {(pendingApproval.length > 0 || overdue.length > 0) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Tasks Requiring Attention</h4>
                      <div className="space-y-2">
                        {pendingApproval.map((task, taskIdx) => (
                          <div key={taskIdx} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">{task.taskName}</span>
                              <span className="ml-2 text-xs text-gray-600">- Pending Approval</span>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleTaskAction(employeeData, task, 'approve')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleTaskAction(employeeData, task, 'reject')}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleTaskAction(employeeData, task, 'view')}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {overdue.map((task, taskIdx) => (
                          <div key={taskIdx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-900">{task.taskName}</span>
                              <span className="ml-2 text-xs text-red-600">
                                - Overdue (Due: {new Date(task.dueDate).toLocaleDateString()})
                              </span>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleTaskAction(employeeData, task, 'extend')}
                              >
                                <CalendarDays className="h-3 w-3 mr-1" />
                                Extend
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleTaskAction(employeeData, task, 'complete')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleTaskAction(employeeData, task, 'view')}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* View All Tasks Button */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      to={`/onboarding/instances/${instance._id}`}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
                    >
                      View All Tasks
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Task Action Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false)
          setSelectedTask(null)
          setSelectedEmployee(null)
          setActionType(null)
          setFormData({})
        }}
        title={
          actionType === 'approve' ? 'Approve Task' :
          actionType === 'reject' ? 'Reject Task' :
          actionType === 'reassign' ? 'Reassign Task' :
          actionType === 'extend' ? 'Extend Due Date' :
          actionType === 'complete' ? 'Manually Complete Task' :
          actionType === 'comment' ? 'Add Comment' :
          'Task Details'
        }
        size="lg"
      >
        {selectedTask && selectedEmployee && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{selectedTask.taskName}</h3>
              {selectedTask.taskDescription && (
                <p className="text-sm text-gray-600">{selectedTask.taskDescription}</p>
              )}
              <div className="mt-2 text-xs text-gray-500">
                <span>Due: {new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                <span className="ml-4">Responsible: {selectedTask.responsibleRole}</span>
              </div>
            </div>

            {selectedTask.comments && (
              <div className="p-3 bg-gray-50 rounded text-sm">
                <strong>Comments:</strong>
                <pre className="whitespace-pre-wrap text-gray-700 mt-1">{selectedTask.comments}</pre>
              </div>
            )}

            {actionType === 'approve' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approval Notes (Optional)
                </label>
                <textarea
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="Add any notes about the approval..."
                />
              </div>
            )}

            {actionType === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
            )}

            {actionType === 'reassign' && (
              <div className="space-y-4">
                <Select
                  label="New Responsible Role"
                  value={formData.newResponsibleRole || selectedTask.responsibleRole}
                  onChange={(e) => setFormData({ ...formData, newResponsibleRole: e.target.value })}
                  options={[
                    { value: 'employee', label: 'Employee' },
                    { value: 'hr', label: 'HR' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'it', label: 'IT' },
                    { value: 'admin', label: 'Admin' }
                  ]}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reassignment Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="input"
                    placeholder="Add notes about the reassignment..."
                  />
                </div>
              </div>
            )}

            {actionType === 'extend' && (
              <div className="space-y-4">
                <Input
                  label="New Due Date"
                  type="date"
                  value={formData.newDueDate || ''}
                  onChange={(e) => setFormData({ ...formData, newDueDate: e.target.value })}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Extension
                  </label>
                  <textarea
                    value={formData.reason || ''}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="input"
                    placeholder="Provide a reason for extending the due date..."
                  />
                </div>
              </div>
            )}

            {actionType === 'complete' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Completion Notes (Optional)
                </label>
                <textarea
                  value={formData.comments || ''}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="Add any notes about manually completing this task..."
                />
              </div>
            )}

            {actionType === 'comment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comment <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={formData.comment || ''}
                  onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                  rows={4}
                  className="input"
                  placeholder="Add a comment or request additional details..."
                  required
                />
              </div>
            )}

            {actionType === 'view' && (
              <div className="space-y-3">
                <div>
                  <strong className="text-gray-700">Status:</strong>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status?.replace('_', ' ')}
                  </span>
                </div>
                {selectedTask.attachment && (
                  <div>
                    <strong className="text-gray-700">Attachment:</strong>
                    <a
                      href={selectedTask.attachment.startsWith('http') ? selectedTask.attachment : `/api${selectedTask.attachment}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-primary-600 hover:text-primary-800 text-sm"
                    >
                      View Attachment
                    </a>
                  </div>
                )}
                {selectedTask.completedBy && (
                  <div>
                    <strong className="text-gray-700">Completed By:</strong>
                    <span className="ml-2 text-gray-600">
                      {selectedTask.completedBy?.email || 'N/A'}
                    </span>
                  </div>
                )}
                {selectedTask.completedAt && (
                  <div>
                    <strong className="text-gray-700">Completed At:</strong>
                    <span className="ml-2 text-gray-600">
                      {new Date(selectedTask.completedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {actionType !== 'view' && (
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowTaskModal(false)
                    setSelectedTask(null)
                    setSelectedEmployee(null)
                    setActionType(null)
                    setFormData({})
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  isLoading={
                    approveMutation.isLoading ||
                    reassignMutation.isLoading ||
                    extendDueDateMutation.isLoading ||
                    manuallyCompleteMutation.isLoading ||
                    addCommentMutation.isLoading
                  }
                  disabled={
                    (actionType === 'reject' || actionType === 'comment') && !formData.reason && !formData.comment
                  }
                >
                  {actionType === 'approve' && 'Approve'}
                  {actionType === 'reject' && 'Reject'}
                  {actionType === 'reassign' && 'Reassign'}
                  {actionType === 'extend' && 'Extend Due Date'}
                  {actionType === 'complete' && 'Mark as Complete'}
                  {actionType === 'comment' && 'Add Comment'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default HROnboardingDashboard

