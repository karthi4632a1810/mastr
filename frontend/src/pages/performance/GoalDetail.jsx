import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Edit, ArrowLeft, Calendar, Target, CheckCircle, XCircle, AlertCircle, MessageSquare } from 'lucide-react'
import Button from '../../components/Button'
import { useAuth } from '../../contexts/AuthContext'

const GoalDetail = () => {
  const { id } = useParams()
  const { user } = useAuth()

  const { data: goal, isLoading } = useQuery({
    queryKey: ['goal', id],
    queryFn: async () => {
      const response = await api.get(`/goals/${id}`)
      return response.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Goal not found</p>
        <Link to="/performance/goals" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Goals
        </Link>
      </div>
    )
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

  const canEdit = (user?.role === 'admin' || user?.role === 'hr') 
    ? (goal.status === 'draft' || goal.status === 'reopened')
    : (goal.status === 'draft' || goal.status === 'reopened' || (goal.proposedBy === 'employee' && goal.status === 'pending_approval'))

  return (
    <div>
      {/* Professional Header Banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-6 py-8 mb-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/performance/goals">
              <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">{goal.title}</h1>
              <p className="text-primary-100">
                {goal.employee?.firstName} {goal.employee?.lastName} - {goal.performanceCycle?.name}
              </p>
              <p className="text-primary-200 text-sm font-mono mt-1">Goal ID: {goal._id?.slice(-8) || id}</p>
            </div>
          </div>
          {canEdit && (
            <Link to={`/performance/goals/${id}/edit`}>
              <Button className="bg-white text-primary-700 hover:bg-primary-50">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Goal Information */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Goal Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="text-gray-900 mt-1 whitespace-pre-wrap">
                  {goal.description || 'No description provided'}
                </dd>
              </div>

              {goal.successCriteria && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Success Criteria</dt>
                  <dd className="text-gray-900 mt-1 whitespace-pre-wrap">{goal.successCriteria}</dd>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="text-gray-900 mt-1">{getCategoryLabel(goal.category)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Weightage</dt>
                  <dd className="text-gray-900 font-semibold mt-1">{goal.weightage}%</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                  <dd className="text-gray-900 mt-1">
                    {new Date(goal.dueDate).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                      {goal.status?.replace('_', ' ')}
                    </span>
                  </dd>
                </div>
              </div>

              {goal.isMandatory && (
                <div className="pt-4 border-t border-gray-200">
                  <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Mandatory Goal
                  </span>
                </div>
              )}
            </dl>
          </div>

          {/* Comments */}
          {goal.comments && goal.comments.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Comments</h2>
              <div className="space-y-4">
                {goal.comments.map((comment, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900">
                          {comment.user?.firstName} {comment.user?.lastName || comment.user?.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Employee Info */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Employee</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-gray-900">
                  {goal.employee?.firstName} {goal.employee?.lastName}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
                <dd className="text-gray-900">{goal.employee?.employeeId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-gray-900">{goal.employee?.email}</dd>
              </div>
            </dl>
          </div>

          {/* Performance Cycle */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Cycle</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Cycle</dt>
                <dd className="text-gray-900">{goal.performanceCycle?.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Period</dt>
                <dd className="text-gray-900">
                  {goal.performanceCycle?.startDate 
                    ? `${new Date(goal.performanceCycle.startDate).toLocaleDateString()} - ${new Date(goal.performanceCycle.endDate).toLocaleDateString()}`
                    : '-'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Approval Info */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Approval Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Proposed By</dt>
                <dd className="text-gray-900 capitalize">{goal.proposedBy}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Assigned By</dt>
                <dd className="text-gray-900">{goal.assignedBy?.email || '-'}</dd>
              </div>
              {goal.approvedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                  <dd className="text-gray-900">{goal.approvedBy?.email}</dd>
                  {goal.approvedAt && (
                    <dd className="text-xs text-gray-500 mt-1">
                      {new Date(goal.approvedAt).toLocaleString()}
                    </dd>
                  )}
                </div>
              )}
              {goal.rejectedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Rejected By</dt>
                  <dd className="text-gray-900">{goal.rejectedBy?.email}</dd>
                  {goal.rejectedAt && (
                    <dd className="text-xs text-gray-500 mt-1">
                      {new Date(goal.rejectedAt).toLocaleString()}
                    </dd>
                  )}
                  {goal.rejectionReason && (
                    <dd className="text-sm text-red-600 mt-1">{goal.rejectionReason}</dd>
                  )}
                </div>
              )}
              {goal.reopenedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Reopened By</dt>
                  <dd className="text-gray-900">{goal.reopenedBy?.email}</dd>
                  {goal.reopenedAt && (
                    <dd className="text-xs text-gray-500 mt-1">
                      {new Date(goal.reopenedAt).toLocaleString()}
                    </dd>
                  )}
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GoalDetail

