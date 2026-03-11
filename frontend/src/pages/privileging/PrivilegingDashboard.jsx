import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { Shield, CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react'

const PrivilegingDashboard = () => {
  const { user } = useAuth()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['privileging-dashboard'],
    queryFn: async () => {
      const response = await api.get('/privileging/dashboard')
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

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Privileging Dashboard</h1>
            <p className="text-purple-100 mt-1">Doctor privileging overview and statistics</p>
          </div>
          <Shield className="h-12 w-12 text-purple-200 opacity-80" />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Privileges</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalPrivileges || 0}</p>
            </div>
            <div className="bg-purple-50 rounded-full p-3">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Active Privileges</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activePrivileges || 0}</p>
            </div>
            <div className="bg-green-50 rounded-full p-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Expired Privileges</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.expiredPrivileges || 0}</p>
            </div>
            <div className="bg-red-50 rounded-full p-3">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Suspended</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.suspendedPrivileges || 0}</p>
            </div>
            <div className="bg-yellow-50 rounded-full p-3">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Due for Renewal</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.dueForRenewal || 0}</p>
              <p className="text-xs text-gray-500 mt-2 font-medium">Next 90 days</p>
            </div>
            <div className="bg-orange-50 rounded-full p-3">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Pending Requests</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingRequests || 0}</p>
            </div>
            <div className="bg-blue-50 rounded-full p-3">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stats.dueForRenewal > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center">
            <div className="bg-yellow-100 rounded-full p-3 mr-4">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-bold text-yellow-900 text-lg">Renewal Alert</h3>
              <p className="text-sm text-yellow-700 mt-1 font-medium">
                {stats.dueForRenewal} privilege(s) due for renewal in the next 90 days
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.expiredPrivileges > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center">
            <div className="bg-red-100 rounded-full p-3 mr-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-red-900 text-lg">Expired Privileges</h3>
              <p className="text-sm text-red-700 mt-1 font-medium">
                {stats.expiredPrivileges} privilege(s) have expired and require immediate attention
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.suspendedPrivileges > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="bg-orange-100 rounded-full p-3 mr-4">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-orange-900 text-lg">Suspended Privileges</h3>
              <p className="text-sm text-orange-700 mt-1 font-medium">
                {stats.suspendedPrivileges} privilege(s) are currently suspended
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrivilegingDashboard

