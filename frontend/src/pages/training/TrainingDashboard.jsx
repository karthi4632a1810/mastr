import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { GraduationCap, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

const TrainingDashboard = () => {
  const { user } = useAuth()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['training-dashboard'],
    queryFn: async () => {
      const response = await api.get('/training/dashboard')
      return response.data.data || {}
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const stats = dashboardData?.statistics || {}
  const compliance = dashboardData?.mandatoryTrainingCompliance || []

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Training Dashboard</h1>
            <p className="text-primary-100 mt-1">Training compliance and statistics overview</p>
          </div>
          <GraduationCap className="h-12 w-12 text-primary-200 opacity-80" />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Programs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPrograms || 0}</p>
            </div>
            <div className="bg-primary-50 rounded-full p-3">
              <GraduationCap className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Records</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalRecords || 0}</p>
            </div>
            <div className="bg-green-50 rounded-full p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedRecords || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-full p-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Expired</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.expiredRecords || 0}</p>
            </div>
            <div className="bg-red-50 rounded-full p-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Training Compliance */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
          Mandatory Training Compliance
        </h2>
        {compliance.length > 0 ? (
          <div className="space-y-4">
            {compliance.map((item) => (
              <div key={item.programId} className="border border-gray-200 rounded-lg p-5 hover:border-primary-300 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{item.programName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.programCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-medium">
                      {item.completed} / {item.total} employees
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${
                      item.compliancePercentage >= 90
                        ? 'text-green-600'
                        : item.compliancePercentage >= 70
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                      {item.compliancePercentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mt-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      item.compliancePercentage >= 90
                        ? 'bg-gradient-to-r from-green-500 to-green-600'
                        : item.compliancePercentage >= 70
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                        : 'bg-gradient-to-r from-red-500 to-red-600'
                    }`}
                    style={{ width: `${Math.min(item.compliancePercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">No mandatory training data available</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrainingDashboard

