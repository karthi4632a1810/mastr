import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { 
  Calendar, 
  TrendingUp, 
  Clock, 
  Award, 
  Gift,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Hourglass,
  PiggyBank,
  ArrowRight,
  Info
} from 'lucide-react'
import { useState, useMemo } from 'react'
import Select from '../../components/Select'

const LeaveBalanceDashboard = () => {
  const { user } = useAuth()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedLeaveType, setSelectedLeaveType] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  // Fetch enhanced leave balance
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['enhanced-leave-balance'],
    queryFn: async () => {
      const response = await api.get('/leaves/balance/enhanced')
      return response.data?.data
    }
  })

  // Fetch monthly usage
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['monthly-leave-usage', selectedYear],
    queryFn: async () => {
      const response = await api.get(`/leaves/balance/monthly-usage?year=${selectedYear}`)
      return response.data?.data
    }
  })

  // Fetch upcoming credits
  const { data: creditsData } = useQuery({
    queryKey: ['upcoming-credits'],
    queryFn: async () => {
      const response = await api.get('/leaves/balance/upcoming-credits')
      return response.data?.data || []
    }
  })

  // Fetch holidays
  const { data: holidaysData } = useQuery({
    queryKey: ['company-holidays', selectedYear],
    queryFn: async () => {
      const response = await api.get(`/leaves/holidays?year=${selectedYear}`)
      return response.data?.data
    }
  })

  // Fetch leave history
  const { data: historyData } = useQuery({
    queryKey: ['leave-history', selectedYear, selectedLeaveType],
    queryFn: async () => {
      const params = new URLSearchParams({ year: selectedYear, limit: 10 })
      if (selectedLeaveType) params.append('leaveTypeId', selectedLeaveType)
      const response = await api.get(`/leaves/balance/history?${params.toString()}`)
      return response.data?.data || []
    }
  })

  const balances = balanceData?.balances || []
  const monthlyUsage = usageData?.monthlyUsage || []
  const burnRate = usageData?.burnRate || []
  const upcomingCredits = creditsData || []
  const holidays = holidaysData?.upcoming || []
  const leaveHistory = historyData || []

  // Calculate totals
  const totalQuota = balances.reduce((sum, b) => sum + b.summary.totalQuota, 0)
  const totalUsed = balances.reduce((sum, b) => sum + b.summary.used, 0)
  const totalPending = balances.reduce((sum, b) => sum + b.summary.pending, 0)
  const totalAvailable = balances.reduce((sum, b) => sum + b.summary.available, 0)

  // Chart calculations
  const maxMonthlyUsage = Math.max(...monthlyUsage.map(m => m.totalDays), 1)

  // Year options
  const currentYear = new Date().getFullYear()
  const yearOptions = [
    { value: currentYear - 1, label: String(currentYear - 1) },
    { value: currentYear, label: String(currentYear) },
    { value: currentYear + 1, label: String(currentYear + 1) }
  ]

  const formatDate = (date) => new Date(date).toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'cancelled': return 'text-gray-600 bg-gray-100'
      case 'pending': return 'text-amber-600 bg-amber-100'
      case 'info_requested': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      case 'pending': return <Hourglass className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Calendar for holidays
  const holidayCalendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const cells = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const holiday = holidaysData?.all?.find(h => 
        new Date(h.date).toISOString().split('T')[0] === dateStr
      )
      cells.push({ day, date, holiday, isWeekend: date.getDay() === 0 || date.getDay() === 6 })
    }
    
    return cells
  }, [calendarMonth, holidaysData])

  if (balanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Balance</h1>
          <p className="text-gray-600 mt-1">
            Track your leave entitlements and usage
          </p>
        </div>
        <Select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          options={yearOptions}
          className="w-32"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Quota</p>
              <p className="text-3xl font-bold text-blue-900">{totalQuota}</p>
              <p className="text-xs text-blue-600 mt-1">days/year</p>
            </div>
            <Calendar className="h-10 w-10 text-blue-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Available</p>
              <p className="text-3xl font-bold text-green-900">{totalAvailable.toFixed(1)}</p>
              <p className="text-xs text-green-600 mt-1">days remaining</p>
            </div>
            <Award className="h-10 w-10 text-green-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Used</p>
              <p className="text-3xl font-bold text-amber-900">{totalUsed.toFixed(1)}</p>
              <p className="text-xs text-amber-600 mt-1">days consumed</p>
            </div>
            <TrendingUp className="h-10 w-10 text-amber-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Pending</p>
              <p className="text-3xl font-bold text-purple-900">{totalPending.toFixed(1)}</p>
              <p className="text-xs text-purple-600 mt-1">awaiting approval</p>
            </div>
            <Clock className="h-10 w-10 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Leave Type Breakdown */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Type Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {balances.map((balance) => (
            <div 
              key={balance.leaveType._id} 
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{balance.leaveType.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded text-gray-600">
                    {balance.leaveType.code}
                  </span>
                </div>
                {!balance.leaveType.isPaid && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Unpaid</span>
                )}
              </div>
              
              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Used: {balance.summary.used}</span>
                  <span>Quota: {balance.summary.totalQuota}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-500 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min((balance.summary.used / Math.max(balance.summary.totalQuota, 1)) * 100, 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Available:</span>
                  <span className="font-medium text-green-600">{balance.summary.available}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending:</span>
                  <span className="font-medium text-amber-600">{balance.summary.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Credited:</span>
                  <span className="font-medium">{balance.summary.creditedThisYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">C/F:</span>
                  <span className="font-medium">{balance.summary.carriedForward}</span>
                </div>
                {balance.summary.lop > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-500">LOP:</span>
                    <span className="font-medium text-red-600">{balance.summary.lop}</span>
                  </div>
                )}
              </div>

              {/* Rules info */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap gap-2 text-xs">
                  {balance.rules.accrual.frequency !== 'none' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {balance.rules.accrual.frequency} accrual
                    </span>
                  )}
                  {balance.rules.carryForward.enabled && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      C/F up to {balance.rules.carryForward.maxDays}d
                    </span>
                  )}
                  {balance.rules.encashment.enabled && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                      Encashable
                    </span>
                  )}
                  {balance.rules.usage.allowHalfDay && (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                      Half-day
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Usage Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Leave Usage</h2>
          <div className="space-y-3">
            {monthlyUsage.map((month) => (
              <div key={month.month} className="flex items-center gap-3">
                <span className="w-10 text-sm text-gray-500 font-medium">{month.monthName}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded transition-all"
                    style={{ width: `${(month.totalDays / maxMonthlyUsage) * 100}%` }}
                  />
                  {month.totalDays > 0 && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {month.totalDays.toFixed(1)}d
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between text-sm">
            <span className="text-gray-500">Total Used:</span>
            <span className="font-semibold">{usageData?.totalUsed || 0} days</span>
          </div>
        </div>

        {/* Burn Rate Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Burn Rate</h2>
          <div className="h-64 relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-400">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
            
            {/* Chart area */}
            <div className="ml-10 h-56 relative border-l border-b border-gray-200">
              {/* Expected line (dashed) */}
              <svg className="absolute inset-0 w-full h-full">
                <line 
                  x1="0" y1="100%" 
                  x2="100%" y2="0" 
                  stroke="#e5e7eb" 
                  strokeWidth="2" 
                  strokeDasharray="5,5"
                />
              </svg>
              
              {/* Actual burn rate bars */}
              <div className="absolute inset-0 flex items-end justify-around px-2">
                {burnRate.map((month, idx) => (
                  <div key={month.month} className="flex flex-col items-center gap-1" style={{ width: '7%' }}>
                    <div 
                      className={`w-full rounded-t transition-all ${
                        month.actual > month.expected ? 'bg-amber-400' : 'bg-green-400'
                      }`}
                      style={{ height: `${Math.min(month.actual, 100)}%` }}
                      title={`${month.monthName}: ${month.actual}% (Expected: ${month.expected}%)`}
                    />
                    <span className="text-[10px] text-gray-400">{month.monthName.charAt(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-400 rounded"></span>
              <span className="text-gray-600">On Track</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-400 rounded"></span>
              <span className="text-gray-600">Above Expected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-1 bg-gray-300"></span>
              <span className="text-gray-600">Expected</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Credits */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary-500" />
            Upcoming Credits
          </h2>
          {upcomingCredits.length > 0 ? (
            <div className="space-y-3">
              {upcomingCredits.slice(0, 5).map((credit, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div>
                    <p className="font-medium text-gray-900">{credit.leaveType.name}</p>
                    <p className="text-xs text-gray-500">{formatDate(credit.creditDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">+{credit.creditAmount}</p>
                    <p className="text-xs text-gray-500">{credit.frequency}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Gift className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No upcoming credits</p>
            </div>
          )}
        </div>

        {/* Company Holidays */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary-500" />
              Holidays
            </h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-medium min-w-20 text-center">
                {calendarMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}
              </span>
              <button 
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="font-medium text-gray-400 py-1">{d}</div>
            ))}
            {holidayCalendarCells.map((cell, idx) => (
              <div 
                key={idx} 
                className={`aspect-square flex items-center justify-center text-xs rounded ${
                  !cell ? '' :
                  cell.holiday ? 'bg-green-100 text-green-800 font-medium' :
                  cell.isWeekend ? 'bg-gray-100 text-gray-400' :
                  'text-gray-700'
                }`}
                title={cell?.holiday?.name}
              >
                {cell?.day}
              </div>
            ))}
          </div>

          {/* Upcoming holidays list */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Upcoming Holidays</p>
            {holidays.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {holidays.slice(0, 4).map((holiday, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">{holiday.name}</span>
                    <span className="text-gray-400 text-xs whitespace-nowrap ml-2">
                      {formatDate(holiday.date)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No upcoming holidays</p>
            )}
          </div>
        </div>

        {/* Recent Leave History */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary-500" />
            Recent History
          </h2>
          {leaveHistory.length > 0 ? (
            <div className="space-y-3">
              {leaveHistory.slice(0, 5).map((leave) => (
                <div key={leave._id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{leave.leaveType?.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${getStatusColor(leave.status)}`}>
                        {getStatusIcon(leave.status)}
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-medium text-gray-900">{leave.days}d</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No leave history</p>
            </div>
          )}
        </div>
      </div>

      {/* Accrual Rules Info */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900">Understanding Your Leave Balance</h3>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>• <strong>Available:</strong> Leaves you can apply for right now (after deducting pending requests)</li>
              <li>• <strong>Credited:</strong> Total leaves credited to you this year based on accrual policy</li>
              <li>• <strong>C/F (Carry Forward):</strong> Unused leaves carried over from last year</li>
              <li>• <strong>LOP (Loss of Pay):</strong> Unpaid leave days when balance was insufficient</li>
              <li>• <strong>Burn Rate:</strong> Compares your actual leave usage vs expected linear usage</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeaveBalanceDashboard

