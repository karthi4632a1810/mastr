import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { 
  Clock, Calendar, DollarSign, Package, FileText, 
  ArrowRight, TrendingUp, AlertCircle, CheckCircle2,
  UserCircle, Briefcase, Receipt, Target, Star,
  Activity, Bell, Award, Zap, Download
} from 'lucide-react'
import Button from '../../components/Button'
import { format } from 'date-fns'

// Helper function to safely format dates
const safeFormatDate = (date, formatStr, fallback = 'N/A') => {
  if (!date) return fallback
  try {
    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return fallback
    return format(dateObj, formatStr)
  } catch (error) {
    return fallback
  }
}

const EmployeeDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // ESS Dashboard Data
  const { data: essData, isLoading: essLoading } = useQuery({
    queryKey: ['ess-dashboard'],
    queryFn: async () => {
      const response = await api.get('/ess/dashboard')
      return response.data.data
    },
  })

  // Attendance Summary
  const { data: attendanceSummary } = useQuery({
    queryKey: ['employee-attendance-summary'],
    queryFn: async () => {
      const response = await api.get('/attendance/summary')
      return response.data.data
    },
  })

  // Leave Balance
  const { data: leaveBalance } = useQuery({
    queryKey: ['employee-leave-balance'],
    queryFn: async () => {
      const response = await api.get('/leaves/balance')
      return response.data.data
    },
  })

  // Recent Payslips
  const { data: recentPayslips } = useQuery({
    queryKey: ['employee-payslips'],
    queryFn: async () => {
      const response = await api.get('/payroll/payslips', { params: { limit: 3 } })
      return response.data.data || []
    },
  })

  // My Assets
  const { data: myAssets } = useQuery({
    queryKey: ['employee-assets'],
    queryFn: async () => {
      const response = await api.get('/assets/my-assets')
      return response.data.data || []
    },
  })

  // My Expenses
  const { data: myExpenses } = useQuery({
    queryKey: ['employee-expenses'],
    queryFn: async () => {
      const response = await api.get('/expenses/my-expenses', { params: { limit: 5 } })
      return response.data.data || []
    },
  })

  // Open Requests
  const { data: openRequests } = useQuery({
    queryKey: ['employee-open-requests'],
    queryFn: async () => {
      const [leaves, changeRequests] = await Promise.all([
        api.get('/leaves/requests', { params: { status: 'pending', limit: 5 } }),
        api.get('/employees/change-requests', { params: { status: 'pending', limit: 5 } })
      ])
      return {
        leaves: leaves.data.data || [],
        changeRequests: changeRequests.data.data || []
      }
    },
  })

  // Performance Goals
  const { data: performanceGoals } = useQuery({
    queryKey: ['employee-goals'],
    queryFn: async () => {
      const response = await api.get('/goals/my-goals')
      return response.data.data || []
    },
  })

  const profileSnapshot = essData?.profileSnapshot || {}
  const attendance = essData?.attendanceSummary || {}
  const leaves = essData?.leaveBalance || {}

  const statCards = [
    {
      name: 'Today Attendance',
      value: attendance?.today?.status === 'punched_in' ? 'Punched In' : 
             attendance?.today?.status === 'punched_out' ? 'Punched Out' : 'Not Punched',
      icon: Clock,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      link: '/attendance',
      subValue: safeFormatDate(attendance?.today?.punchInTime, 'HH:mm', '--:--')
    },
    {
      name: 'Monthly Attendance',
      value: `${attendance?.monthly?.attendancePercentage || 0}%`,
      icon: Activity,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      link: '/attendance',
      subValue: `${attendance?.monthly?.presentDays || 0} days present`
    },
    {
      name: 'Leave Balance',
      value: leaves?.balances?.reduce((sum, l) => sum + (l.available || 0), 0) || 0,
      icon: Calendar,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      link: '/leave-balance',
      subValue: `${leaves?.balances?.length || 0} leave types`
    },
    {
      name: 'My Assets',
      value: myAssets?.length || 0,
      icon: Package,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      link: '/my-assets',
      subValue: `${myAssets?.filter(a => a.status === 'assigned')?.length || 0} active`
    },
  ]

  const quickActions = [
    { label: 'Punch In/Out', action: () => navigate('/attendance'), icon: Clock, color: 'bg-blue-500' },
    { label: 'Apply Leave', action: () => navigate('/leaves'), icon: Calendar, color: 'bg-green-500' },
    { label: 'View Payslip', action: () => navigate('/payroll'), icon: DollarSign, color: 'bg-yellow-500' },
    { label: 'My Assets', action: () => navigate('/my-assets'), icon: Package, color: 'bg-purple-500' },
    { label: 'Submit Expense', action: () => navigate('/expenses'), icon: Receipt, color: 'bg-pink-500' },
    { label: 'My Profile', action: () => navigate('/my-profile'), icon: UserCircle, color: 'bg-indigo-500' },
  ]

  if (essLoading) {
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
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, <span className="font-semibold text-primary-600">
              {profileSnapshot?.firstName || user?.employee?.firstName || user?.email}
            </span>!
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {format(new Date(), 'EEEE, MMMM dd, yyyy')}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                    {stat.subValue && (
                      <p className="text-xs text-gray-500 mt-1">{stat.subValue}</p>
                    )}
                  </div>
                </div>
                {stat.link && (
                  <ArrowRight className={`h-5 w-5 ${stat.textColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
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
          {/* Profile & Attendance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Snapshot */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Profile Snapshot</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/my-profile')}>
                  View Profile
                </Button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Employee ID</span>
                  <span className="font-medium text-gray-800">{profileSnapshot?.employeeId || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Department</span>
                  <span className="font-medium text-gray-800">{profileSnapshot?.department || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Designation</span>
                  <span className="font-medium text-gray-800">{profileSnapshot?.designation || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Manager</span>
                  <span className="font-medium text-gray-800">{profileSnapshot?.reportingManager || 'N/A'}</span>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Profile Completion</span>
                    <span className="font-bold text-primary-600">{profileSnapshot?.completionPercentage || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
                      style={{ width: `${profileSnapshot?.completionPercentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Attendance */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Today's Attendance</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/attendance')}>
                  View Details
                </Button>
              </div>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  attendance?.today?.status === 'punched_in' ? 'bg-green-50 border border-green-200' :
                  attendance?.today?.status === 'punched_out' ? 'bg-blue-50 border border-blue-200' :
                  'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      attendance?.today?.status === 'punched_in' ? 'bg-green-500 animate-pulse' :
                      attendance?.today?.status === 'punched_out' ? 'bg-blue-500' :
                      'bg-gray-300'
                    }`}></div>
                    <span className="font-medium text-gray-800">
                      {attendance?.today?.status === 'punched_in' ? 'Currently Working' :
                       attendance?.today?.status === 'punched_out' ? 'Punched Out' :
                       'Not Punched In'}
                    </span>
                  </div>
                  {attendance?.today?.punchInTime && (
                    <div className="text-sm text-gray-600">
                      <p>In: {safeFormatDate(attendance.today.punchInTime, 'HH:mm', '--:--')}</p>
                      {attendance?.today?.punchOutTime && (
                        <p>Out: {safeFormatDate(attendance.today.punchOutTime, 'HH:mm', '--:--')}</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{attendance?.monthly?.presentDays || 0}</div>
                    <div className="text-xs text-gray-500">Present</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{attendance?.monthly?.lateCount || 0}</div>
                    <div className="text-xs text-gray-500">Late</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{attendance?.monthly?.earlyLeaveCount || 0}</div>
                    <div className="text-xs text-gray-500">Early Leave</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Balance */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Leave Balance</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/leaves')}>
                Apply Leave
              </Button>
            </div>
            {leaves?.balances && leaves.balances.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {leaves.balances.slice(0, 4).map((leave, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-600 mb-1">{leave.name}</p>
                    <p className="text-2xl font-bold text-gray-900">{leave.available}</p>
                    <p className="text-xs text-gray-500">of {leave.total}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No leave balance available</p>
            )}
          </div>

          {/* Recent Payslips */}
          {recentPayslips && recentPayslips.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Payslips</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/payroll')}>
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {recentPayslips.map((payslip) => (
                  <div key={payslip._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {payslip.month} {payslip.year}
                      </p>
                      <p className="text-sm text-gray-600">{payslip.status}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-900">
                        ₹{payslip.netSalary?.toLocaleString()}
                      </span>
                      <button className="p-2 hover:bg-gray-200 rounded-lg">
                        <Download className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Goals */}
          {performanceGoals && performanceGoals.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">My Goals</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/performance/goals')}>
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {performanceGoals.slice(0, 3).map((goal) => (
                  <div key={goal._id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{goal.title}</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                        goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {goal.status}
                      </span>
                    </div>
                    {goal.progress !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{goal.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{ width: `${goal.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Open Requests */}
          {(openRequests?.leaves?.length > 0 || openRequests?.changeRequests?.length > 0) && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Open Requests</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/my-requests')}>
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {openRequests.leaves?.slice(0, 3).map((leave) => (
                  <div key={leave._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium text-gray-900">Leave Request</p>
                        <p className="text-sm text-gray-600">
                          {safeFormatDate(leave.startDate, 'MMM dd')} - {safeFormatDate(leave.endDate, 'MMM dd')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                      leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                ))}
                {openRequests.changeRequests?.slice(0, 2).map((request) => (
                  <div key={request._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900">Change Request</p>
                        <p className="text-sm text-gray-600">{request.field}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {request.status}
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

          {/* My Assets Summary */}
          {myAssets && myAssets.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">My Assets</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/my-assets')}>
                  View All
                </Button>
              </div>
              <div className="space-y-2">
                {myAssets.slice(0, 4).map((asset) => (
                  <div key={asset._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium text-gray-800">{asset.name}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      asset.status === 'assigned' ? 'bg-green-100 text-green-800' :
                      asset.status === 'returned' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {asset.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Expenses */}
          {myExpenses && myExpenses.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Expenses</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/expenses')}>
                  View All
                </Button>
              </div>
              <div className="space-y-2">
                {myExpenses.slice(0, 4).map((expense) => (
                  <div key={expense._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{expense.category}</p>
                      <p className="text-xs text-gray-500">{safeFormatDate(expense.date, 'MMM dd')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₹{expense.amount?.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                        expense.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {expense.status}
                      </span>
                    </div>
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

export default EmployeeDashboard

