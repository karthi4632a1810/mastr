import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import Table from '../../components/Table'
import Button from '../../components/Button'
import Input from '../../components/Input'
import { Download, BarChart3, Activity } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

const ShiftAnalytics = () => {
  const { showToast } = useToast()
  const today = new Date()
  const defaultMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)

  const params = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return { month, year }
  }, [selectedMonth])

  const { data: occupancyData, isLoading: loadingOcc } = useQuery({
    queryKey: ['analytics-occupancy', params],
    queryFn: async () => {
      const res = await api.get('/analytics/shift/occupancy', { params: { ...params, granularity: 'day' } })
      return res.data?.data || []
    },
  })

  const { data: overtimeData } = useQuery({
    queryKey: ['analytics-overtime'],
    queryFn: async () => {
      const res = await api.get('/analytics/shift/overtime', { params: { months: 6 } })
      return res.data?.data || []
    },
  })

  const { data: complianceData } = useQuery({
    queryKey: ['analytics-compliance', params],
    queryFn: async () => {
      const res = await api.get('/analytics/shift/compliance', { params })
      return res.data?.data || {}
    },
  })

  const { data: changeSummary } = useQuery({
    queryKey: ['analytics-change-summary', params],
    queryFn: async () => {
      const res = await api.get('/analytics/shift/changes', { params })
      return res.data?.data || {}
    },
  })

  const { data: staffingData } = useQuery({
    queryKey: ['analytics-staffing', params],
    queryFn: async () => {
      const res = await api.get('/analytics/shift/staffing', { params })
      return res.data?.data || { daily: [], understaffed: [], overstaffed: [] }
    },
  })

  const handleExport = async (format = 'csv') => {
    try {
      const res = await api.get('/analytics/shift/export', {
        params: { ...params, format },
        responseType: 'blob'
      })
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `shift-analytics.${format === 'excel' ? 'csv' : 'csv'}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      showToast(error.response?.data?.message || 'Export failed', 'error')
    }
  }

  const occupancyColumns = [
    { key: 'period', header: 'Date' },
    { key: 'shift', header: 'Shift' },
    { key: 'count', header: 'Count' },
  ]

  const overtimeColumns = [
    { key: 'month', header: 'Month' },
    { key: 'overtimeHours', header: 'Overtime Hours' },
  ]

  const staffingColumns = [
    { key: 'day', header: 'Date' },
    { key: 'count', header: 'Assigned' },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift & Roster Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor occupancy, overtime, compliance and staffing signals</p>
        </div>
        <div className="flex gap-3 items-center">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-auto"
          />
          <Button onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 p-3 rounded-lg"><BarChart3 className="h-6 w-6 text-white" /></div>
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-semibold text-gray-900">{complianceData?.present ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 p-3 rounded-lg"><BarChart3 className="h-6 w-6 text-white" /></div>
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-semibold text-gray-900">{complianceData?.absent ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-3 rounded-lg"><Activity className="h-6 w-6 text-white" /></div>
            <div>
              <p className="text-sm text-gray-600">Late</p>
              <p className="text-2xl font-semibold text-gray-900">{complianceData?.late ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 p-3 rounded-lg"><Activity className="h-6 w-6 text-white" /></div>
            <div>
              <p className="text-sm text-gray-600">Shift Changes (pending)</p>
              <p className="text-2xl font-semibold text-gray-900">{changeSummary?.pending ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Shift Occupancy (daily)</h2>
          </div>
          <Table columns={occupancyColumns} data={occupancyData || []} isLoading={loadingOcc} emptyMessage="No data" />
        </div>
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Overtime Trend (last 6 months)</h2>
          </div>
          <Table columns={overtimeColumns} data={overtimeData || []} emptyMessage="No data" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Staffing Levels</h2>
          </div>
          <Table columns={staffingColumns} data={staffingData?.daily || []} emptyMessage="No data" />
          <div className="mt-3 text-sm text-gray-700">
            <div><span className="font-semibold">Understaffed:</span> {staffingData?.understaffed?.length || 0} day(s)</div>
            <div><span className="font-semibold">Overstaffed:</span> {staffingData?.overstaffed?.length || 0} day(s)</div>
          </div>
        </div>
        <div className="card">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Shift Change Requests</h2>
          </div>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex justify-between"><span>Pending</span><span className="font-semibold">{changeSummary?.pending ?? 0}</span></div>
            <div className="flex justify-between"><span>Approved</span><span className="font-semibold">{changeSummary?.approved ?? 0}</span></div>
            <div className="flex justify-between"><span>Rejected</span><span className="font-semibold">{changeSummary?.rejected ?? 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShiftAnalytics

