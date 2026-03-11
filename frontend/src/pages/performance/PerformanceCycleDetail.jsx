import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Edit, ArrowLeft, Calendar, Users, Eye, CheckCircle, Clock } from 'lucide-react'
import Button from '../../components/Button'

const PerformanceCycleDetail = () => {
  const { id } = useParams()

  const { data: cycle, isLoading } = useQuery({
    queryKey: ['performanceCycle', id],
    queryFn: async () => {
      const response = await api.get(`/performance-cycles/${id}`)
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

  if (!cycle) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Performance cycle not found</p>
        <Link to="/performance/cycles" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Cycles
        </Link>
      </div>
    )
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

  return (
    <div>
      {/* Professional Header Banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-6 py-8 mb-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/performance/cycles">
              <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">{cycle.name}</h1>
              <p className="text-primary-100">{getCycleTypeLabel(cycle.cycleType)} Performance Cycle</p>
              <p className="text-primary-200 text-sm font-mono mt-1">Cycle ID: {cycle._id?.slice(-8) || id}</p>
            </div>
          </div>
          <Link to={`/performance/cycles/${id}/edit`}>
            <Button className="bg-white text-primary-700 hover:bg-primary-50">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Cycle Information */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Cycle Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Cycle Type</dt>
                <dd className="text-gray-900">{getCycleTypeLabel(cycle.cycleType)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Period</dt>
                <dd className="text-gray-900">
                  {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cycle.status)}`}>
                    {cycle.status?.charAt(0).toUpperCase() + cycle.status?.slice(1)}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Workflow Windows */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Workflow Windows</h2>
            <div className="space-y-4">
              {cycle.workflowWindows?.goalSetting?.enabled && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Goal Setting</h3>
                  <p className="text-sm text-gray-600">
                    {cycle.workflowWindows.goalSetting.startDate 
                      ? `${new Date(cycle.workflowWindows.goalSetting.startDate).toLocaleDateString()} - ${new Date(cycle.workflowWindows.goalSetting.endDate).toLocaleDateString()}`
                      : 'Not configured'}
                  </p>
                  {cycle.notifications?.goalSettingEnabled && (
                    <span className="inline-block mt-2 text-xs text-blue-600">Notifications enabled</span>
                  )}
                </div>
              )}
              {cycle.workflowWindows?.selfAssessment?.enabled && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Self-Assessment</h3>
                  <p className="text-sm text-gray-600">
                    {cycle.workflowWindows.selfAssessment.startDate 
                      ? `${new Date(cycle.workflowWindows.selfAssessment.startDate).toLocaleDateString()} - ${new Date(cycle.workflowWindows.selfAssessment.endDate).toLocaleDateString()}`
                      : 'Not configured'}
                  </p>
                  {cycle.notifications?.selfAssessmentEnabled && (
                    <span className="inline-block mt-2 text-xs text-blue-600">Notifications enabled</span>
                  )}
                </div>
              )}
              {cycle.workflowWindows?.managerReview?.enabled && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Manager Review</h3>
                  <p className="text-sm text-gray-600">
                    {cycle.workflowWindows.managerReview.startDate 
                      ? `${new Date(cycle.workflowWindows.managerReview.startDate).toLocaleDateString()} - ${new Date(cycle.workflowWindows.managerReview.endDate).toLocaleDateString()}`
                      : 'Not configured'}
                  </p>
                  {cycle.notifications?.managerReviewEnabled && (
                    <span className="inline-block mt-2 text-xs text-blue-600">Notifications enabled</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Details */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Created By</dt>
                <dd className="text-gray-900">{cycle.createdBy?.email || '-'}</dd>
              </div>
              {cycle.activatedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Activated By</dt>
                  <dd className="text-gray-900">{cycle.activatedBy?.email || '-'}</dd>
                </div>
              )}
              {cycle.activatedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Activated At</dt>
                  <dd className="text-gray-900">{new Date(cycle.activatedAt).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Departments */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Departments</h2>
            {cycle.associatedDepartments && cycle.associatedDepartments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cycle.associatedDepartments.map((dept, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {dept.name || dept}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">All departments</p>
            )}
          </div>

          {/* Employee Inclusion */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Employee Inclusion</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Include All Active</dt>
                <dd className="text-gray-900">
                  {cycle.employeeInclusion?.includeAllActive ? (
                    <CheckCircle className="h-5 w-5 text-green-600 inline" />
                  ) : (
                    <Clock className="h-5 w-5 text-gray-400 inline" />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Exclude Notice Period</dt>
                <dd className="text-gray-900">
                  {cycle.employeeInclusion?.excludeNoticePeriod ? 'Yes' : 'No'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Eligible Employees</dt>
                <dd className="text-gray-900 font-semibold">{cycle.eligibleEmployeeCount || 0}</dd>
              </div>
            </dl>
          </div>

          {/* Visibility */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Visibility</h2>
            <div className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Goal Status Visible To</dt>
                <dd className="flex flex-wrap gap-1">
                  {cycle.visibilitySettings?.goalStatusVisibleTo?.map((role, idx) => (
                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs capitalize">
                      {role}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Ratings Visible To</dt>
                <dd className="flex flex-wrap gap-1">
                  {cycle.visibilitySettings?.ratingsVisibleTo?.map((role, idx) => (
                    <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs capitalize">
                      {role}
                    </span>
                  ))}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceCycleDetail

