import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { CheckCircle, Clock, FileText, Upload, X, Calendar, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Modal from '../../components/Modal'

const EmployeeOnboardingTasks = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [selectedTask, setSelectedTask] = useState(null)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [comments, setComments] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [groupBy, setGroupBy] = useState('dueDate') // 'dueDate' or 'responsibleRole'

  const { data: onboardingInstances, isLoading } = useQuery({
    queryKey: ['onboardingTasks'],
    queryFn: async () => {
      const response = await api.get('/onboarding')
      return response.data.data || []
    },
  })

  const activeInstance = onboardingInstances?.find(instance => 
    instance.status === 'in_progress' || instance.status === 'pending'
  )

  const completeTaskMutation = useMutation({
    mutationFn: async ({ instanceId, taskIndex, status, comments, attachment }) => {
      const formData = new FormData()
      formData.append('status', status)
      if (comments) formData.append('comments', comments)
      if (attachment) formData.append('attachment', attachment)

      const response = await api.put(
        `/onboarding/instances/${instanceId}/tasks/${taskIndex}/status`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingTasks'])
      queryClient.invalidateQueries(['ess-dashboard'])
      showToast('Task completed successfully', 'success')
      setShowCompleteModal(false)
      setSelectedTask(null)
      setComments('')
      setAttachment(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to complete task', 'error')
    }
  })

  const handleCompleteTask = (instance, task, index) => {
    setSelectedTask({ instance, task, index })
    setComments(task.comments || '')
    setAttachment(null)
    setShowCompleteModal(true)
  }

  const handleSubmitCompletion = () => {
    if (!selectedTask) return

    // Validate required attachment
    if (selectedTask.task.requiresAttachment && !attachment && !selectedTask.task.attachment) {
      showToast('Attachment is required for this task', 'error')
      return
    }

    completeTaskMutation.mutate({
      instanceId: selectedTask.instance._id,
      taskIndex: selectedTask.index,
      status: 'completed',
      comments,
      attachment
    })
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'pending_approval':
        return <Clock className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString()
  }

  const groupTasks = (tasks) => {
    if (!tasks) return {}

    if (groupBy === 'dueDate') {
      const grouped = {
        overdue: [],
        today: [],
        thisWeek: [],
        later: []
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekFromNow = new Date(today)
      weekFromNow.setDate(weekFromNow.getDate() + 7)

      tasks.forEach(task => {
        const dueDate = new Date(task.dueDate)
        dueDate.setHours(0, 0, 0, 0)

        if (isOverdue(task.dueDate) && task.status !== 'completed') {
          grouped.overdue.push(task)
        } else if (dueDate.getTime() === today.getTime()) {
          grouped.today.push(task)
        } else if (dueDate <= weekFromNow) {
          grouped.thisWeek.push(task)
        } else {
          grouped.later.push(task)
        }
      })

      return grouped
    } else {
      // Group by responsible role
      const grouped = {}
      tasks.forEach(task => {
        const role = task.responsibleRole || 'other'
        if (!grouped[role]) grouped[role] = []
        grouped[role].push(task)
      })
      return grouped
    }
  }

  const getGroupLabel = (groupKey) => {
    if (groupBy === 'dueDate') {
      const labels = {
        overdue: 'Overdue',
        today: 'Due Today',
        thisWeek: 'Due This Week',
        later: 'Due Later'
      }
      return labels[groupKey] || groupKey
    } else {
      return groupKey.charAt(0).toUpperCase() + groupKey.slice(1).replace('_', ' ')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!activeInstance) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Onboarding</h2>
        <p className="text-gray-600">You don't have any active onboarding tasks at the moment.</p>
      </div>
    )
  }

  const tasks = activeInstance.tasks || []
  const groupedTasks = groupTasks(tasks)
  const progress = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
    : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Onboarding Tasks</h1>
        <p className="text-gray-600 mt-1">Complete your onboarding tasks to finish all joining formalities</p>
      </div>

      {/* Progress Overview */}
      <div className="card mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Onboarding Progress</h2>
            <p className="text-sm text-gray-600 mt-1">
              Template: {activeInstance.template?.name || 'N/A'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary-600">{progress}%</div>
            <div className="text-sm text-gray-600">
              {tasks.filter(t => t.status === 'completed').length} of {tasks.length} completed
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-primary-600 h-3 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Group By Toggle */}
      <div className="card mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Group by:</span>
          <button
            onClick={() => setGroupBy('dueDate')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              groupBy === 'dueDate'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Due Date
          </button>
          <button
            onClick={() => setGroupBy('responsibleRole')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              groupBy === 'responsibleRole'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <User className="h-4 w-4 inline mr-2" />
            Responsible Party
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-6">
        {Object.keys(groupedTasks).map(groupKey => {
          const groupTasks = groupedTasks[groupKey]
          if (groupTasks.length === 0) return null

          return (
            <div key={groupKey} className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {getGroupLabel(groupKey)}
                {groupKey === 'overdue' && (
                  <span className="ml-2 text-sm text-red-600">({groupTasks.length})</span>
                )}
              </h3>
              <div className="space-y-4">
                {groupTasks.map((task, index) => {
                  const actualIndex = tasks.findIndex((t, idx) => {
                    if (t._id && task._id) return t._id === task._id
                    return idx === tasks.indexOf(task)
                  })
                  const canComplete = task.responsibleRole === 'employee' && 
                    task.status !== 'completed' && 
                    task.status !== 'pending_approval'

                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        isOverdue(task.dueDate) && task.status !== 'completed'
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(task.status)}`}>
                              {getStatusIcon(task.status)}
                              <span>{task.status?.replace('_', ' ')}</span>
                            </span>
                            {task.isRequired && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                Required
                              </span>
                            )}
                            {task.requiresAttachment && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                Attachment Required
                              </span>
                            )}
                            {task.requiresApproval && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                Requires Approval
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">{task.taskName}</h4>
                          {task.taskDescription && (
                            <p className="text-sm text-gray-600 mb-2">{task.taskDescription}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              Responsible: {task.responsibleRole}
                            </span>
                            {task.completedAt && (
                              <span className="flex items-center text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed: {new Date(task.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {task.comments && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                              <strong>Comments:</strong> {task.comments}
                            </div>
                          )}
                          {task.attachment && (
                            <div className="mt-2">
                              <a
                                href={task.attachment.startsWith('http') ? task.attachment : `/api${task.attachment}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                View Attachment
                              </a>
                            </div>
                          )}
                        </div>
                        {canComplete && (
                          <Button
                            onClick={() => handleCompleteTask(activeInstance, task, actualIndex)}
                            size="sm"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Complete Task Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false)
          setSelectedTask(null)
          setComments('')
          setAttachment(null)
        }}
        title="Complete Task"
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">{selectedTask.task.taskName}</h3>
              {selectedTask.task.taskDescription && (
                <p className="text-sm text-gray-600">{selectedTask.task.taskDescription}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="input"
                placeholder="Add any comments or notes about completing this task..."
              />
            </div>

            {selectedTask.task.requiresAttachment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Attachment {selectedTask.task.attachment ? '(Update)' : '(Required)'}
                </label>
                {selectedTask.task.attachment && (
                  <div className="mb-2 p-2 bg-gray-50 rounded text-sm">
                    <a
                      href={selectedTask.task.attachment.startsWith('http') ? selectedTask.task.attachment : `/api${selectedTask.task.attachment}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800 flex items-center"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Current: {selectedTask.task.attachment.split('/').pop()}
                    </a>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      onChange={(e) => setAttachment(e.target.files[0])}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <div className="flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 transition-colors">
                      <Upload className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">
                        {attachment ? attachment.name : 'Choose file (PDF, DOC, DOCX, Images)'}
                      </span>
                    </div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
            )}

            {selectedTask.task.requiresApproval && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  This task requires approval. It will be submitted for review after completion.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCompleteModal(false)
                  setSelectedTask(null)
                  setComments('')
                  setAttachment(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitCompletion}
                isLoading={completeTaskMutation.isLoading}
                disabled={selectedTask.task.requiresAttachment && !attachment && !selectedTask.task.attachment}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {selectedTask.task.requiresApproval ? 'Submit for Approval' : 'Complete Task'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default EmployeeOnboardingTasks

