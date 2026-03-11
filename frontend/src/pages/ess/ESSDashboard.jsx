import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { 
  User, Clock, Calendar, DollarSign, FileText, Bell, 
  ChevronRight, Download, TrendingUp, Award, Zap,
  Briefcase, UserCheck, AlertCircle, CheckCircle2,
  CalendarDays, Edit, Gift, PartyPopper, Sun, Moon,
  Timer, Target, Sparkles, ArrowUpRight, Activity
} from 'lucide-react'
import { useState, useEffect } from 'react'

const ESSDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [greeting, setGreeting] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 17) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['ess-dashboard'],
    queryFn: async () => {
      const response = await api.get('/ess/dashboard')
      return response.data.data
    },
    refetchInterval: 60000 // Refresh every minute
  })

  const { data: attendanceTrends } = useQuery({
    queryKey: ['ess-attendance-trends'],
    queryFn: async () => {
      const response = await api.get('/ess/attendance-trends')
      return response.data.data
    }
  })

  const { data: celebrations } = useQuery({
    queryKey: ['ess-celebrations'],
    queryFn: async () => {
      const response = await api.get('/ess/celebrations')
      return response.data.data
    }
  })

  const { data: onboardingTasks } = useQuery({
    queryKey: ['onboardingTasks'],
    queryFn: async () => {
      const response = await api.get('/onboarding')
      return response.data.data || []
    }
  })

  const activeOnboarding = onboardingTasks?.find(instance => 
    instance.status === 'in_progress' || instance.status === 'pending'
  )

  const getOnboardingProgress = () => {
    if (!activeOnboarding || !activeOnboarding.tasks) return 0
    const completed = activeOnboarding.tasks.filter(t => t.status === 'completed').length
    return Math.round((completed / activeOnboarding.tasks.length) * 100)
  }

  const pendingTasks = activeOnboarding?.tasks?.filter(t => 
    t.status === 'pending' || t.status === 'in_progress'
  ).slice(0, 5) || []

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600"></div>
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-gray-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Unable to load dashboard</h2>
          <p className="text-gray-500 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { 
    profileSnapshot, 
    attendanceSummary, 
    leaveBalance, 
    recentPayslips, 
    openRequests,
    upcomingShifts,
    notifications,
    insights,
    quickActions,
    badges 
  } = dashboardData || {}

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdi0yMGgtNjB6IiBmaWxsLW9wYWNpdHk9Ii4wNSIgZmlsbD0iI2ZmZiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profileSnapshot?.profilePhoto ? (
                <img 
                  src={profileSnapshot.profilePhoto} 
                  alt={profileSnapshot?.name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white/30 shadow-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border-4 border-white/30">
                  <User className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <p className="text-white/70 text-sm flex items-center gap-2">
                {new Date().getHours() < 17 ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {greeting}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold">{profileSnapshot?.firstName || 'Welcome'}!</h1>
              <p className="text-white/80 text-sm mt-1">
                {profileSnapshot?.designation} • {profileSnapshot?.department}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-2">
            <div className="text-3xl md:text-4xl font-light tabular-nums">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-white/70 text-sm">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="relative mt-6 flex flex-wrap gap-2">
          {quickActions?.map((action) => (
            <button
              key={action.id}
              onClick={() => navigate(action.url)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 backdrop-blur rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
            >
              <Zap className="w-4 h-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Snapshot & Attendance Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Snapshot Tile */}
            <div 
              className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/my-profile')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Profile Snapshot</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Employee ID</span>
                  <span className="font-medium text-gray-800">{profileSnapshot?.employeeId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Manager</span>
                  <span className="font-medium text-gray-800">{profileSnapshot?.reportingManager}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tenure</span>
                  <span className="font-medium text-gray-800">{profileSnapshot?.tenure}</span>
                </div>
                
                {/* Profile Completion */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Profile Completion</span>
                    <span className="font-bold text-indigo-600">{profileSnapshot?.completionPercentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${profileSnapshot?.completionPercentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Summary Tile */}
            <div 
              className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/attendance')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Attendance</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </div>

              {/* Today's Status */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  attendanceSummary?.today?.status === 'punched_out' ? 'bg-green-500' :
                  attendanceSummary?.today?.status === 'punched_in' ? 'bg-amber-500 animate-pulse' :
                  'bg-gray-300'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">
                    {attendanceSummary?.today?.status === 'punched_out' ? 'Punched Out' :
                     attendanceSummary?.today?.status === 'punched_in' ? 'Currently Working' :
                     'Not Punched In'}
                  </p>
                  {attendanceSummary?.today?.punchInTime && (
                    <p className="text-xs text-gray-500">
                      In: {new Date(attendanceSummary.today.punchInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {attendanceSummary?.today?.punchOutTime && 
                        ` • Out: ${new Date(attendanceSummary.today.punchOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                      }
                    </p>
                  )}
                </div>
              </div>

              {/* Monthly Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-800">{attendanceSummary?.monthly?.attendancePercentage || 0}%</div>
                  <div className="text-xs text-gray-500">Attendance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">{attendanceSummary?.monthly?.lateCount || 0}</div>
                  <div className="text-xs text-gray-500">Late Arrivals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{attendanceSummary?.monthly?.earlyLeaveCount || 0}</div>
                  <div className="text-xs text-gray-500">Early Leaves</div>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Balance & Recent Payslips Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Leave Balance Tile */}
            <div 
              className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/leave-balance')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl text-white">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Leave Balance</h3>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate('/leaves'); }}
                  className="text-xs px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full font-medium hover:bg-orange-100 transition-colors"
                >
                  Apply Leave
                </button>
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin">
                {leaveBalance?.balances?.slice(0, 4).map((leave, index) => (
                  <div key={leave.id || index} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        leave.available > 0 ? 'bg-green-500' : 'bg-gray-300'
                      }`}></span>
                      <span className="text-sm text-gray-700">{leave.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{leave.available}</span>
                      <span className="text-xs text-gray-400">/ {leave.total}</span>
                    </div>
                  </div>
                ))}
              </div>

              {leaveBalance?.nextHoliday && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-600">
                    Next Holiday: <span className="font-medium">{leaveBalance.nextHoliday.name}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Recent Payslips Tile */}
            <div 
              className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => navigate('/payroll')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Recent Payslips</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
              </div>

              {recentPayslips?.payslips?.length > 0 ? (
                <div className="space-y-3">
                  {recentPayslips.payslips.map((payslip, index) => (
                    <div 
                      key={payslip.id || index} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{payslip.monthYear}</p>
                        <p className="text-xs text-gray-500">{payslip.paymentStatus}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-800">
                          ₹{payslip.netSalary?.toLocaleString('en-IN')}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); }}
                          className="p-1.5 hover:bg-white rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4 text-gray-400 hover:text-green-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Average Salary */}
                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Average Net</span>
                    <span className="text-sm font-semibold text-green-600">
                      ₹{recentPayslips.avgNetSalary?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No payslips available</p>
                </div>
              )}
            </div>
          </div>

          {/* Onboarding Checklist Tile */}
          {activeOnboarding && (
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate('/onboarding')}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-800">Onboarding Checklist</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold text-gray-800">{getOnboardingProgress()}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${getOnboardingProgress()}%` }}
                  />
                </div>
              </div>

              {pendingTasks.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {pendingTasks.map((task, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className={`mt-1 w-4 h-4 rounded border-2 flex-shrink-0 ${
                        task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {task.status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{task.taskName}</p>
                        {task.taskDescription && (
                          <p className="text-xs text-gray-500 mt-0.5">{task.taskDescription}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                          {task.responsibleRole !== 'employee' && ` • ${task.responsibleRole}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">All tasks completed!</p>
                </div>
              )}
            </div>
          )}

          {/* Open Requests Tile */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800">Open Requests</h3>
              </div>
              {openRequests?.totalPending > 0 && (
                <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-semibold">
                  {openRequests.totalPending} Pending
                </span>
              )}
            </div>

            {openRequests?.totalPending > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Leave Requests */}
                <div 
                  className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/leaves')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    <span className="text-2xl font-bold text-orange-600">{openRequests.leaves?.count || 0}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Leave Requests</p>
                  <p className="text-xs text-gray-500">Pending approval</p>
                </div>

                {/* Attendance Regularizations */}
                <div 
                  className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/attendance')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Timer className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-bold text-blue-600">{openRequests.regularizations?.count || 0}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Regularizations</p>
                  <p className="text-xs text-gray-500">Corrections pending</p>
                </div>

                {/* Profile Changes */}
                <div 
                  className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate('/change-requests')}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Edit className="w-5 h-5 text-purple-500" />
                    <span className="text-2xl font-bold text-purple-600">{openRequests.profileChanges?.count || 0}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">Profile Updates</p>
                  <p className="text-xs text-gray-500">Under review</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500">All caught up! No pending requests.</p>
              </div>
            )}
          </div>

          {/* Attendance Trends Chart */}
          {attendanceTrends && attendanceTrends.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-white">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800">Attendance Trends</h3>
                <span className="text-xs text-gray-400 ml-auto">Last 6 months</span>
              </div>
              
              <div className="flex items-end justify-between gap-2 h-40">
                {attendanceTrends.map((month, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col items-center">
                      <span className="text-xs font-medium text-gray-600 mb-1">{month.attendancePercentage}%</span>
                      <div 
                        className="w-full max-w-[40px] bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t-lg transition-all duration-500 hover:opacity-80"
                        style={{ height: `${Math.max(month.attendancePercentage * 1.2, 10)}px` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-400">{month.month}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Notifications & Alerts */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl text-white relative">
                <Bell className="w-5 h-5" />
                {notifications?.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                    {notifications.length}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-800">Notifications</h3>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notifications?.length > 0 ? notifications.map((notif, index) => (
                <div 
                  key={notif.id || index}
                  className={`p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02] ${
                    notif.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                    notif.type === 'celebration' ? 'bg-purple-50 border border-purple-200' :
                    notif.type === 'info' ? 'bg-blue-50 border border-blue-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}
                  onClick={() => notif.actionUrl && navigate(notif.actionUrl)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {notif.type === 'warning' ? '⚠️' :
                       notif.type === 'celebration' ? '🎉' :
                       notif.type === 'info' ? 'ℹ️' : '📌'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                    </div>
                    {notif.actionUrl && (
                      <ArrowUpRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No new notifications</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Shifts */}
          {upcomingShifts?.length > 0 && (
            <div 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => navigate('/my-roster')}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl text-white">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800">Upcoming Shifts</h3>
              </div>

              <div className="space-y-2">
                {upcomingShifts.slice(0, 5).map((shift, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div 
                      className="w-1 h-10 rounded-full"
                      style={{ backgroundColor: shift.color || '#3B82F6' }}
                    ></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{shift.dayName}</p>
                      <p className="text-xs text-gray-500">{shift.dateFormatted}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{shift.shift}</p>
                      <p className="text-xs text-gray-400">{shift.startTime} - {shift.endTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {insights?.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800">AI Insights</h3>
              </div>

              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div 
                    key={insight.id || index}
                    className={`p-3 rounded-xl ${
                      insight.type === 'positive' ? 'bg-green-50 border border-green-200' :
                      insight.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                      'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{insight.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{insight.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gamification Badges */}
          {badges?.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800">Your Badges</h3>
              </div>

              <div className="flex flex-wrap gap-3">
                {badges.map((badge, index) => (
                  <div 
                    key={badge.id || index}
                    className="flex flex-col items-center p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-pointer"
                    title={badge.description}
                  >
                    <span className="text-2xl mb-1">{badge.icon}</span>
                    <span className="text-xs font-medium text-gray-700 text-center">{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Celebrations */}
          {celebrations?.length > 0 && (
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl text-white">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-800">Team Celebrations</h3>
              </div>

              <div className="space-y-3">
                {celebrations.slice(0, 5).map((celebration, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-lg">
                    <span className="text-xl">{celebration.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{celebration.name}</p>
                      <p className="text-xs text-gray-500">
                        {celebration.type === 'birthday' ? 'Birthday' : `${celebration.years} Year Anniversary`} • {celebration.date}
                      </p>
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

export default ESSDashboard

