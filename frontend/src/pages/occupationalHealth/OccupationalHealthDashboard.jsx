import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { Heart, Stethoscope, AlertTriangle, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'

const OccupationalHealthDashboard = () => {
  const { user } = useAuth()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['occupational-health-dashboard'],
    queryFn: async () => {
      const response = await api.get('/occupational-health/dashboard')
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
  const vaccineCompliance = dashboardData?.vaccineCompliance || []

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Occupational Health Dashboard</h1>
            <p className="text-blue-100 mt-1">Health & safety compliance overview</p>
          </div>
          <Stethoscope className="h-12 w-12 text-blue-200 opacity-80" />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Immunizations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.immunizations?.total || 0}</p>
              <p className="text-xs text-gray-500 mt-2 font-medium">Due Soon: {stats.immunizations?.dueSoon || 0}</p>
            </div>
            <div className="bg-pink-50 rounded-full p-3">
              <Heart className="h-8 w-8 text-pink-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Health Checkups</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.healthCheckups?.total || 0}</p>
              <p className="text-xs text-gray-500 mt-2 font-medium">Due Soon: {stats.healthCheckups?.dueSoon || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-full p-3">
              <Stethoscope className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Exposures (30 days)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.occupationalExposures?.last30Days || 0}</p>
              <p className="text-xs text-gray-500 mt-2 font-medium">Total: {stats.occupationalExposures?.total || 0}</p>
            </div>
            <div className="bg-orange-50 rounded-full p-3">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Incidents (30 days)</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.incidents?.last30Days || 0}</p>
              <p className="text-xs text-red-600 mt-2 font-semibold">Critical Open: {stats.incidents?.criticalOpen || 0}</p>
            </div>
            <div className="bg-red-50 rounded-full p-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Vaccine Compliance */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Heart className="h-6 w-6 text-pink-600 mr-2" />
          Vaccine Compliance
        </h2>
        {vaccineCompliance.length > 0 ? (
          <div className="space-y-4">
            {vaccineCompliance.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-5 hover:border-pink-300 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {item.vaccineType.toUpperCase()}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 font-medium">
                      {item.completedRecords} / {item.totalEmployees} employees
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
            <p className="text-gray-500 text-lg">No vaccine compliance data available</p>
          </div>
        )}
      </div>

      {/* Unfit Employees Alert */}
      {stats.healthCheckups?.unfitEmployees > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-full p-3 mr-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-red-900 text-lg">Action Required</h3>
              <p className="text-sm text-red-700 mt-1 font-medium">
                {stats.healthCheckups.unfitEmployees} employee(s) marked as unfit or fit with restrictions
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OccupationalHealthDashboard

