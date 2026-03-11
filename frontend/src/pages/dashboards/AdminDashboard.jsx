import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { 
  Users, Clock, Calendar, DollarSign, Package, 
  FileCheck2, TrendingUp, ArrowRight, Briefcase,
  UserCheck, AlertCircle, CheckCircle2, XCircle,
  Target, Star, MapPin, Settings, Activity, BarChart3,
  Building2, Shield, Database, Zap
} from 'lucide-react'
import Button from '../../components/Button'
import { format } from 'date-fns'

const AdminDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Dashboard Stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard')
      return response.data.data
    },
  })

  // Headcount Trend
  const { data: headcountTrend } = useQuery({
    queryKey: ['admin-headcount-trend'],
    queryFn: async () => {
      const response = await api.get('/analytics/headcount', { params: { months: 6 } })
      return response.data.data || []
    },
  })

  // Department Strength
  const { data: departmentStrength } = useQuery({
    queryKey: ['admin-department-strength'],
    queryFn: async () => {
      const response = await api.get('/analytics/departments')
      return response.data.data || []
    },
  })

  // Recent Leave Requests
  const { data: recentLeaves } = useQuery({
    queryKey: ['admin-recent-leaves'],
    queryFn: async () => {
      const response = await api.get('/leaves/requests', { params: { limit: 10, status: 'pending' } })
      return response.data.data || []
    },
  })

  // Pending Expenses
  const { data: pendingExpenses } = useQuery({
    queryKey: ['admin-pending-expenses'],
    queryFn: async () => {
      const response = await api.get('/expenses', { params: { status: 'pending', limit: 10 } })
      return response.data.data || []
    },
  })

  // Attendance Dashboard
  const { data: attendanceDashboard } = useQuery({
    queryKey: ['admin-attendance-dashboard'],
    queryFn: async () => {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const response = await api.get('/attendance/dashboard', {
        params: {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0],
          limit: 10
        }
      })
      return response.data
    },
  })

  // Payroll Dashboard
  const { data: payrollDashboard } = useQuery({
    queryKey: ['admin-payroll-dashboard'],
    queryFn: async () => {
      const response = await api.get('/payroll/dashboard')
      return response.data.data
    },
  })

  // Recent Employees
  const { data: recentEmployees } = useQuery({
    queryKey: ['admin-recent-employees'],
    queryFn: async () => {
      const response = await api.get('/employees', { params: { limit: 5, sort: '-createdAt' } })
      return response.data.data || []
    },
  })

  // Pending Onboarding
  const { data: pendingOnboarding } = useQuery({
    queryKey: ['admin-pending-onboarding'],
    queryFn: async () => {
      const response = await api.get('/onboarding/instances', { params: { status: 'in_progress', limit: 5 } })
      return response.data.data || []
    },
  })

  // Performance Reviews Pending
  const { data: pendingReviews } = useQuery({
    queryKey: ['admin-pending-reviews'],
    queryFn: async () => {
      const response = await api.get('/performance-reviews', { params: { status: 'pending', limit: 5 } })
      return response.data.data || []
    },
  })

  // Attendance Mode Configuration Summary
  const { data: attendanceModeSummary } = useQuery({
    queryKey: ['attendance-mode-summary'],
    queryFn: async () => {
      const response = await api.get('/attendance-modes/summary')
      return response.data.data || null
    },
  })

  // Shift Analytics
  const { data: shiftAnalytics } = useQuery({
    queryKey: ['admin-shift-analytics'],
    queryFn: async () => {
      const response = await api.get('/analytics/shift/occupancy', { params: { months: 1 } })
      return response.data.data || []
    },
  })

  const statCards = [
    {
      name: 'Total Employees',
      value: stats?.totalEmployees || 0,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      link: '/employees',
      trend: headcountTrend && headcountTrend.length > 1 ? 
        headcountTrend[headcountTrend.length - 1].count - headcountTrend[headcountTrend.length - 2].count : 0
    },
    {
      name: 'Today Attendance',
      value: stats?.todayAttendance || 0,
      icon: Clock,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      link: '/attendance-dashboard'
    },
    {
      name: 'Departments',
      value: stats?.departments || 0,
      icon: Building2,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      link: '/settings'
    },
    {
      name: 'Pending Leaves',
      value: stats?.pendingLeaves || recentLeaves?.length || 0,
      icon: Calendar,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      link: '/leave-approvals'
    },
    {
      name: 'Pending Expenses',
      value: pendingExpenses?.length || 0,
      icon: FileCheck2,
      color: 'bg-pink-500',
      textColor: 'text-pink-600',
      link: '/expense-approvals'
    },
    {
      name: 'Active Assets',
      value: stats?.activeAssets || 0,
      icon: Package,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      link: '/assets'
    },
  ]

  const quickActions = [
    { label: 'Add Employee', action: () => navigate('/employees/new'), icon: UserCheck, color: 'bg-blue-500' },
    { label: 'Analytics', action: () => navigate('/analytics'), icon: BarChart3, color: 'bg-purple-500' },
    { label: 'Attendance Dashboard', action: () => navigate('/attendance-dashboard'), icon: Clock, color: 'bg-green-500' },
    { label: 'Payroll Dashboard', action: () => navigate('/payroll-dashboard'), icon: DollarSign, color: 'bg-yellow-500' },
    { label: 'Settings', action: () => navigate('/settings'), icon: Settings, color: 'bg-gray-500' },
    { label: 'Performance Reviews', action: () => navigate('/performance/reviews'), icon: Target, color: 'bg-indigo-500' },
  ]

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, <span className="font-semibold text-primary-600">{user?.employee?.firstName || user?.email}</span>!
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {format(new Date(), 'EEEE, MMMM dd, yyyy')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div 
              key={stat.name} 
              className="card hover:shadow-xl transition-all duration-300 cursor-pointer group hover-lift"
              onClick={() => stat.link && navigate(stat.link)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <div className={`${stat.color} p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600 mb-1 truncate">{stat.name}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                    {stat.trend !== undefined && stat.trend !== 0 && (
                      <p className={`text-xs mt-1 ${stat.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.trend > 0 ? '+' : ''}{stat.trend} this month
                      </p>
                    )}
                  </div>
                </div>
                {stat.link && (
                  <ArrowRight className={`h-4 w-4 ${stat.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - 2 spans */}
        <div className="lg:col-span-2 space-y-6">
          {/* Analytics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Headcount Trend */}
            {headcountTrend && headcountTrend.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Headcount Trend</h2>
                  <Button variant="outline" size="sm" onClick={() => navigate('/analytics')}>
                    View Details
                  </Button>
                </div>
                <div className="flex items-end justify-between gap-2 h-32">
                  {headcountTrend.slice(-6).map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:opacity-80"
                        style={{ height: `${(data.count / Math.max(...headcountTrend.map(d => d.count))) * 100}%` }}
                      ></div>
                      <span className="text-xs text-gray-500">{data.month.split('-')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Department Strength */}
            {departmentStrength && departmentStrength.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Department Strength</h2>
                  <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
                    View All
                  </Button>
                </div>
                <div className="space-y-2">
                  {departmentStrength.slice(0, 5).map((dept, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{dept.name}</span>
                      <span className="text-sm font-bold text-gray-900">{dept.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pending Leave Requests */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Pending Leave Requests</h2>
                <p className="text-sm text-gray-500 mt-1">Requires your approval</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/leave-approvals')}
                className="flex items-center"
              >
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            {recentLeaves && recentLeaves.length > 0 ? (
              <div className="space-y-3">
                {recentLeaves.slice(0, 5).map((leave) => (
                  <div 
                    key={leave._id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer"
                    onClick={() => navigate(`/leave-approvals`)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {getStatusIcon(leave.status)}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {leave.leaveType?.name} • {format(new Date(leave.startDate), 'MMM dd')} - {format(new Date(leave.endDate), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                      leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No pending leave requests</p>
              </div>
            )}
          </div>

          {/* Pending Expense Approvals */}
          {pendingExpenses && pendingExpenses.length > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Pending Expense Approvals</h2>
                  <p className="text-sm text-gray-500 mt-1">Requires your attention</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/expense-approvals')}
                  className="flex items-center"
                >
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {pendingExpenses.slice(0, 5).map((expense) => (
                  <div 
                    key={expense._id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer"
                    onClick={() => navigate('/expense-approvals')}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="bg-yellow-100 p-2 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {expense.employee?.firstName} {expense.employee?.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {expense.category} • ₹{expense.amount?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payroll Summary */}
          {payrollDashboard && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Payroll Summary</h2>
                  <p className="text-sm text-gray-500 mt-1">Current month overview</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/payroll-dashboard')}
                  className="flex items-center"
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{payrollDashboard.ytdTotals?.[0]?.totalGross?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Total Gross</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{payrollDashboard.ytdTotals?.[0]?.totalNet?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Total Net</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    ₹{payrollDashboard.ytdTotals?.[0]?.totalDeductions?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Deductions</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {payrollDashboard.monthlySummary?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Months Processed</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Employees */}
          {recentEmployees && recentEmployees.length > 0 && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Recent Employees</h2>
                  <p className="text-sm text-gray-500 mt-1">Newly added employees</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/employees')}
                  className="flex items-center"
                >
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-3">
                {recentEmployees.map((employee) => (
                  <div 
                    key={employee._id} 
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 cursor-pointer"
                    onClick={() => navigate(`/employees/${employee._id}`)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {employee.employeeId} • {employee.department?.name || 'No Department'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      employee.status === 'active' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {employee.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-500 mt-1">Frequently used actions</p>
            </div>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group border border-gray-200"
                  >
                    <div className="flex items-center">
                      <div className={`${action.color} p-2 rounded-lg mr-3`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-gray-700">{action.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Attendance Summary */}
          {attendanceDashboard && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Attendance Summary</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/attendance-dashboard')}>
                  View Details
                </Button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{attendanceDashboard.counts?.present || 0}</div>
                    <div className="text-xs text-gray-600">Present</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{attendanceDashboard.counts?.absent || 0}</div>
                    <div className="text-xs text-gray-600">Absent</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{attendanceDashboard.counts?.late || 0}</div>
                    <div className="text-xs text-gray-600">Late</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{attendanceDashboard.counts?.leave || 0}</div>
                    <div className="text-xs text-gray-600">On Leave</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Mode Configuration */}
          {attendanceModeSummary && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Attendance Modes</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/attendance-modes')}>
                  Configure
                </Button>
              </div>
              {attendanceModeSummary.configured === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-2">No attendance modes configured</p>
                  <p className="text-xs text-gray-400">Click "Configure" to set up attendance mode configurations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attendanceModeSummary.global && (
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-1">Global Configuration</div>
                      <div className="flex flex-wrap gap-2">
                        {attendanceModeSummary.global.modes.faceRecognition.enabled && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Face Recognition</span>
                        )}
                        {attendanceModeSummary.global.modes.geoFence.enabled && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Geo Fence</span>
                        )}
                        {attendanceModeSummary.global.modes.hybrid.enabled && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                            Hybrid ({attendanceModeSummary.global.modes.hybrid.mode === 'or' ? 'OR' : 'AND'})
                          </span>
                        )}
                        {!attendanceModeSummary.global.modes.faceRecognition.enabled && 
                         !attendanceModeSummary.global.modes.geoFence.enabled && 
                         !attendanceModeSummary.global.modes.hybrid.enabled && (
                          <span className="text-xs text-gray-500 italic">No modes enabled</span>
                        )}
                      </div>
                    </div>
                  )}
                  {attendanceModeSummary.byDepartment.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {attendanceModeSummary.byDepartment.length} department-specific configuration(s)
                    </div>
                  )}
                  {attendanceModeSummary.byRole.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {attendanceModeSummary.byRole.length} role-specific configuration(s)
                    </div>
                  )}
                  {attendanceModeSummary.byLocation.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {attendanceModeSummary.byLocation.length} location-specific configuration(s)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pending Onboarding */}
          {pendingOnboarding && pendingOnboarding.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pending Onboarding</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/onboarding/instances')}>
                  View All
                </Button>
              </div>
              <div className="space-y-2">
                {pendingOnboarding.slice(0, 4).map((onboarding) => (
                  <div key={onboarding._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {onboarding.employee?.firstName} {onboarding.employee?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{onboarding.template?.name || 'Onboarding'}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      In Progress
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Performance Reviews */}
          {pendingReviews && pendingReviews.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pending Reviews</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/performance/reviews')}>
                  View All
                </Button>
              </div>
              <div className="space-y-2">
                {pendingReviews.slice(0, 4).map((review) => (
                  <div key={review._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {review.employee?.firstName} {review.employee?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{review.cycle?.name || 'Performance Review'}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

