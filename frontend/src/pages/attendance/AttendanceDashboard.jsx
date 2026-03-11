import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import Table from '../../components/Table'
import Button from '../../components/Button'
import Select from '../../components/Select'
import Input from '../../components/Input'
import { useToast } from '../../contexts/ToastContext'
import { Calendar, Download, Users, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

const AttendanceDashboard = () => {
  const { showToast } = useToast()
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState(startOfMonth)
  const [endDate, setEndDate] = useState(endOfMonth)
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [employeeId, setEmployeeId] = useState('')

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const res = await api.get('/departments')
      return res.data?.data || []
    },
  })

  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['attendance-dashboard', startDate, endDate, departmentFilter, employeeId],
    queryFn: async () => {
      const res = await api.get('/attendance/dashboard', {
        params: {
          startDate,
          endDate,
          departmentId: departmentFilter || undefined,
          employeeId: employeeId || undefined,
          limit: 200
        }
      })
      return res.data
    },
  })

  const counts = dashboardData?.counts || {}
  const records = dashboardData?.data || []

  const exportReport = async () => {
    try {
      const res = await api.get('/attendance/export', {
        params: {
          startDate,
          endDate,
          departmentId: departmentFilter || undefined,
          employeeId: employeeId || undefined,
        },
        responseType: 'blob'
      })

      if (res.data.type === 'application/json') {
        const text = await res.data.text()
        const errorData = JSON.parse(text)
        showToast(errorData.message || 'Failed to export', 'error')
        return
      }

      const url = window.URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'attendance-report.csv')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      showToast('Export started', 'success')
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const errorData = JSON.parse(text)
          showToast(errorData.message || 'Failed to export', 'error')
          return
        } catch (e) {
          // fallthrough
        }
      }
      showToast(error.response?.data?.message || 'Failed to export', 'error')
    }
  }

  const columns = useMemo(() => [
    {
      key: 'date',
      header: 'Date',
      render: (value, row) => {
        if (!row) return '-'
        const date = row.date || value
        if (!date) return '-'
        try {
          return new Date(date).toLocaleDateString()
        } catch (error) {
          return '-'
        }
      }
    },
    {
      key: 'employeeId',
      header: 'Employee',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div className="flex flex-col">
            <span className="font-medium">{row.employee?.firstName || ''} {row.employee?.lastName || ''}</span>
            <span className="text-xs text-gray-500">{row.employee?.employeeId || '-'}</span>
          </div>
        )
      }
    },
    {
      key: 'department',
      header: 'Department',
      render: (value, row) => {
        if (!row) return '-'
        return row.employee?.department?.name || value || '-'
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (!row) return '-'
        const status = row.status || value
        if (!status) return '-'
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === 'present' ? 'bg-green-100 text-green-800' :
            status === 'leave' ? 'bg-blue-100 text-blue-800' :
            status === 'absent' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {status}
          </span>
        )
      }
    },
    {
      key: 'isLate',
      header: 'Late',
      render: (value, row) => {
        if (!row) return '-'
        return row.isLate ? 'Yes' : 'No'
      }
    },
    {
      key: 'workingHours',
      header: 'Hours',
      render: (value, row) => {
        if (!row) return '-'
        const hours = row.workingHours || value || 0
        return Number(hours).toFixed(2)
      }
    }
  ], [])

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Attendance Dashboard</h1>
          <p className="text-gray-600 text-sm sm:text-base">Filter and monitor attendance across employees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => refetch()} className="shadow-sm hover:shadow transition-all duration-200">
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportReport} className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Enhanced Filters */}
      <div className="card mb-6 shadow-md hover:shadow-lg transition-shadow duration-200 border-t-4 border-t-primary-500">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <Calendar className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Select
            label="Department"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...(departments?.map((d) => ({ value: d._id, label: d.name })) || [])
            ]}
          />
          <Input
            label="Employee ID"
            placeholder="e.g. EMP001"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card flex items-center gap-3">
          <div className="bg-green-500 p-3 rounded-lg">
            <CheckCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Present</p>
            <p className="text-2xl font-semibold text-gray-900">{counts.present || 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="bg-red-500 p-3 rounded-lg">
            <XCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Absent</p>
            <p className="text-2xl font-semibold text-gray-900">{counts.absent || 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="bg-blue-500 p-3 rounded-lg">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">On Leave</p>
            <p className="text-2xl font-semibold text-gray-900">{counts.leave || 0}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="bg-yellow-500 p-3 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Late</p>
            <p className="text-2xl font-semibold text-gray-900">{counts.late || 0}</p>
          </div>
        </div>
      </div>

      <div className="card shadow-md">
        <Table
          columns={columns}
          data={records}
          isLoading={isLoading}
          emptyMessage="No attendance records found"
        />
      </div>
    </div>
  )
}

export default AttendanceDashboard

