import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { useRole } from '../../hooks/useRole'
import Button from '../../components/Button'
import Table from '../../components/Table'
import Select from '../../components/Select'
import Input from '../../components/Input'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { Calendar, Upload, AlertTriangle } from 'lucide-react'

const Roster = () => {
  const { showToast } = useToast()
  const { isAdmin, isHR } = useRole()
  const queryClient = useQueryClient()

  const today = new Date()
  const defaultMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10))
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedShift, setSelectedShift] = useState('')
  const [selectedRotation, setSelectedRotation] = useState('')
  const [recurrence, setRecurrence] = useState('daily')
  const [notes, setNotes] = useState('')

  const { data: employees } = useQuery({
    queryKey: ['employees-lite'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { limit: 200, page: 1 } })
      return res.data?.data || []
    },
  })

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/shifts')
      return res.data?.data || []
    },
  })

  const { data: rotations } = useQuery({
    queryKey: ['shift-rotations'],
    queryFn: async () => {
      const res = await api.get('/shift-rotations')
      return res.data?.data || []
    },
  })

  const { data: groups } = useQuery({
    queryKey: ['shift-groups'],
    queryFn: async () => {
      const res = await api.get('/shift-assignments/groups')
      return res.data?.data || []
    },
  })

  const { data: roster, isLoading, error } = useQuery({
    queryKey: ['roster', selectedMonth, selectedGroup],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-')
      const res = await api.get('/shift-assignments', { params: { month: parseInt(month), year: parseInt(year), groupId: selectedGroup || undefined } })
      return res.data?.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load roster', 'error')
    },
  })

  const assignMutation = useMutation({
    mutationFn: async (payload) => api.post('/shift-assignments/assign', payload),
    onSuccess: (resp) => {
      queryClient.invalidateQueries(['roster'])
      showToast(resp.data.message || 'Shifts assigned', 'success')
      if (resp.data?.conflicts?.length) {
        showToast('Some assignments have conflicts', 'warning')
      }
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to assign shifts', 'error')
    },
  })

  const publishMutation = useMutation({
    mutationFn: async () => api.post('/shift-assignments/publish', { startDate, endDate, employeeIds: selectedEmployees }),
    onSuccess: () => {
      queryClient.invalidateQueries(['roster'])
      showToast('Roster published', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to publish roster', 'error')
    },
  })

  const monthCalendarData = useMemo(() => {
    const grouped = {}
    roster?.forEach((item) => {
      const key = new Date(item.date).toDateString()
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(item)
    })
    return Object.entries(grouped)
      .map(([dateStr, items]) => ({ dateStr, items }))
      .sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr))
  }, [roster])

  const handleAssign = (publish = false) => {
    if ((!selectedShift && !selectedRotation) || (!selectedEmployees.length && !selectedGroup)) {
      showToast('Select shift/rotation and employees or group', 'error')
      return
    }
    // Validate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (start > end) {
      showToast('Start date must be before end date', 'error')
      return
    }
    if (end < new Date()) {
      showToast('End date cannot be in the past', 'error')
      return
    }
    assignMutation.mutate({
      employeeIds: selectedEmployees,
      groupId: selectedGroup || undefined,
      shiftId: selectedRotation ? undefined : selectedShift,
      rotationId: selectedRotation || undefined,
      startDate,
      endDate,
      recurrence,
      publish,
      notes,
      type: 'roster'
    })
  }

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (value, row) => {
        if (!row) return '-'
        const dateStr = row.dateStr || value
        if (!dateStr) return '-'
        try {
          return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        } catch (error) {
          return '-'
        }
      }
    },
    {
      key: 'assignments',
      header: 'Assignments',
      render: (value, row) => {
        if (!row || !row.items) return '-'
        return (
          <div className="space-y-2">
            {row.items.map((item) => (
            <div key={item._id} className="flex flex-wrap items-center gap-2 border rounded-lg px-3 py-2">
              <span className="font-medium text-gray-900">{item.employee?.firstName} {item.employee?.lastName}</span>
              <span className="text-xs text-gray-500">{item.employee?.employeeId}</span>
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">{item.shift?.name}</span>
              <span className="text-xs text-gray-600">{item.shift?.startTime} - {item.shift?.endTime}</span>
              {item.rotation?.cycleName && (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  {item.rotation.cycleName} (step {item.rotation.stepIndex + 1})
                </span>
              )}
              {!item.shift?.isActive && (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Inactive Shift</span>
              )}
              {item.conflicts?.length > 0 && (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {item.conflicts.length} conflict(s)
                </span>
              )}
              {item.isPublished ? (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Published</span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">Draft</span>
              )}
            </div>
          ))}
        </div>
        )
      }
    }
  ]

  if (!isAdmin && !isHR) {
    return <div className="card">You do not have access to roster management.</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shift Roster</h1>
          <p className="text-gray-600 mt-1">Assign and publish shifts across employees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => publishMutation.mutate()}>
            <Upload className="h-4 w-4 mr-2" />
            Publish Range
          </Button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Select
            label="Recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
          <Select
            label="Shift"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            disabled={!!selectedRotation}
            options={[
              { value: '', label: 'Select Shift' },
              ...(shifts?.map((s) => ({ value: s._id, label: `${s.name} (${s.startTime}-${s.endTime})` })) || [])
            ]}
          />
          <Select
            label="Rotation"
            value={selectedRotation}
            onChange={(e) => {
              setSelectedRotation(e.target.value)
              if (e.target.value) setSelectedShift('')
            }}
            options={[
              { value: '', label: 'No Rotation' },
              ...(rotations?.map((r) => ({ value: r._id, label: `${r.name} (${r.cycle})` })) || [])
            ]}
          />
          <Select
            label="Shift Group (optional)"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            options={[
              { value: '', label: 'None' },
              ...(groups?.map((g) => ({ value: g._id, label: g.name })) || [])
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employees (multi-select)</label>
            <select
              multiple
              value={selectedEmployees}
              onChange={(e) => {
                const vals = Array.from(e.target.selectedOptions).map(o => o.value)
                setSelectedEmployees(vals)
              }}
              className="input h-32"
            >
              {employees?.map(emp => (
                <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              className="input min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this roster assignment"
            />
          </div>
          <div className="flex items-end gap-3">
            <Button onClick={() => handleAssign(false)} isLoading={assignMutation.isLoading}>
              Assign Draft
            </Button>
            <Button variant="secondary" onClick={() => handleAssign(true)} isLoading={assignMutation.isLoading}>
              Assign & Publish
            </Button>
          </div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            <div>
              <p className="text-sm text-gray-600">Roster Calendar</p>
              <p className="text-lg font-semibold text-gray-900">{selectedMonth}</p>
            </div>
          </div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input w-auto"
          />
        </div>
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading roster..." />
        ) : error ? (
          <EmptyState
            icon={Calendar}
            title="Error loading roster"
            message={error.response?.data?.message || 'Failed to load roster. Please try again.'}
          />
        ) : (
          <Table
            columns={columns}
            data={monthCalendarData}
            isLoading={false}
            emptyMessage="No roster assignments for this period"
          />
        )}
      </div>
    </div>
  )
}

export default Roster

