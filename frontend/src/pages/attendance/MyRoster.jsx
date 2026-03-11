import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import Button from '../../components/Button'
import Select from '../../components/Select'
import Input from '../../components/Input'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { AlertTriangle, Bell, Calendar } from 'lucide-react'

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const shiftColors = {
  regular: 'bg-blue-100 text-blue-800',
  night: 'bg-purple-100 text-purple-800',
  rotational: 'bg-amber-100 text-amber-800',
  weekend: 'bg-green-100 text-green-800'
}

const MyRoster = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()

  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [changeType, setChangeType] = useState('change')
  const [requestedShift, setRequestedShift] = useState('')
  const [swapWithEmployee, setSwapWithEmployee] = useState('')
  const [reason, setReason] = useState('')

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await api.get('/shifts')
      return res.data?.data || []
    },
  })

  const { data: roster, isLoading, error } = useQuery({
    queryKey: ['my-roster', selectedMonth],
    queryFn: async () => {
      const [year, month] = selectedMonth.split('-')
      const res = await api.get('/shift-assignments', { params: { month: parseInt(month), year: parseInt(year) } })
      return res.data?.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load roster', 'error')
    },
  })

  const changeMutation = useMutation({
    mutationFn: async (payload) => api.post('/shift-changes', payload),
    onSuccess: () => {
      showToast('Request submitted', 'success')
      setReason('')
      setRequestedShift('')
      setSwapWithEmployee('')
      queryClient.invalidateQueries(['my-roster'])
      queryClient.invalidateQueries(['shift-changes'])
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit request', 'error')
    },
  })

  const { data: myRequests } = useQuery({
    queryKey: ['shift-changes'],
    queryFn: async () => {
      const res = await api.get('/shift-changes')
      return res.data?.data || []
    },
  })

  const assignmentsByDate = useMemo(() => {
    const map = {}
    roster?.forEach((r) => {
      const key = new Date(r.date).toDateString()
      map[key] = r
    })
    return map
  }, [roster])

  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return new Date(year, month, 0).getDate()
  }, [selectedMonth])

  const selectedKey = selectedDate.toDateString()
  const selectedAssignment = assignmentsByDate[selectedKey]

  const handleDayClick = (day) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    setSelectedDate(new Date(year, month - 1, day))
  }

  const handleRequest = () => {
    if (!selectedAssignment) {
      showToast('Select a day with a shift', 'error')
      return
    }
    if (!reason || reason.trim().length < 10) {
      showToast('Please provide a detailed reason (at least 10 characters)', 'error')
      return
    }
    // Validate date is not in the past
    const selectedDate = new Date(selectedAssignment.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      showToast('Cannot request shift change for past dates', 'error')
      return
    }
    if (changeType === 'change' && !requestedShift) {
      showToast('Please select a requested shift', 'error')
      return
    }
    if (changeType === 'swap' && !swapWithEmployee) {
      showToast('Please enter employee ID to swap with', 'error')
      return
    }
    changeMutation.mutate({
      date: selectedAssignment.date,
      currentShift: selectedAssignment.shift?._id,
      requestedShift: changeType === 'change' ? requestedShift || null : null,
      type: changeType,
      swapWithEmployee: changeType === 'swap' ? swapWithEmployee || null : null,
      reason
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Roster</h1>
          <p className="text-gray-600 mt-1">View your assigned shifts and request changes</p>
        </div>
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-primary-600" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input w-auto"
          />
        </div>
      </div>

      <div className="card mb-6">
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading your roster..." />
        ) : error ? (
          <EmptyState
            icon={Calendar}
            title="Error loading roster"
            message={error.response?.data?.message || 'Failed to load your roster. Please try again.'}
          />
        ) : (
          <>
            <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-600 mb-2">
              {dayNames.map((d) => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const day = idx + 1
            const [year, month] = selectedMonth.split('-').map(Number)
            const date = new Date(year, month - 1, day)
            const key = date.toDateString()
            const assignment = assignmentsByDate[key]
            const isSelected = key === selectedKey
            const cat = assignment?.shift?.category || 'regular'
            const color = shiftColors[cat] || 'bg-gray-100 text-gray-800'
            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`border rounded-lg p-2 text-left min-h-[68px] ${isSelected ? 'border-primary-500 shadow-sm' : 'border-gray-200'}`}
              >
                <div className="flex justify-between items-center text-sm font-semibold text-gray-800">
                  <span>{day}</span>
                  {assignment && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
                      {assignment.shift?.name || 'Shift'}
                    </span>
                  )}
                </div>
                {assignment && (
                  <div className="text-xs text-gray-600 mt-1">
                    {assignment.shift?.startTime} - {assignment.shift?.endTime}
                  </div>
                )}
              </button>
            )
          })}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Day Details</h2>
          {selectedAssignment ? (
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">{new Date(selectedAssignment.date).toDateString()}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${shiftColors[selectedAssignment.shift?.category] || 'bg-gray-100 text-gray-800'}`}>
                  {selectedAssignment.shift?.category || 'Shift'}
                </span>
              </div>
              <div>Shift: {selectedAssignment.shift?.name} ({selectedAssignment.shift?.startTime} - {selectedAssignment.shift?.endTime})</div>
              <div>Break: {selectedAssignment.shift?.breakDuration || 0} mins ({selectedAssignment.shift?.breakType || 'unpaid'})</div>
              <div>Overtime Eligible: {selectedAssignment.shift?.overtimeEligible ? 'Yes' : 'No'}</div>
              {selectedAssignment.rotation?.cycleName && (
                <div>Rotation: {selectedAssignment.rotation.cycleName}</div>
              )}
              {selectedAssignment.conflicts?.length > 0 && (
                <div className="text-amber-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> {selectedAssignment.conflicts.length} conflict(s) flagged
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600">Select a day to view details.</div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Request Change / Swap</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Request Type"
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              options={[
                { value: 'change', label: 'Change Shift' },
                { value: 'swap', label: 'Swap Shift' },
              ]}
            />
            {changeType === 'change' && (
              <Select
                label="Requested Shift"
                value={requestedShift}
                onChange={(e) => setRequestedShift(e.target.value)}
                options={[
                  { value: '', label: 'Select shift' },
                  ...(shifts?.map((s) => ({ value: s._id, label: `${s.name} (${s.startTime}-${s.endTime})` })) || [])
                ]}
              />
            )}
            {changeType === 'swap' && (
              <Input
                label="Swap With (Employee ID)"
                value={swapWithEmployee}
                onChange={(e) => setSwapWithEmployee(e.target.value)}
                placeholder="Enter employee ID"
              />
            )}
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              className="input min-h-[100px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide details for approval"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleRequest} isLoading={changeMutation.isLoading}>
              Submit Request
            </Button>
          </div>
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-3">My Requests</h2>
        <div className="space-y-2 text-sm text-gray-700">
          {(myRequests || []).map((req) => (
            <div key={req._id} className="border rounded-lg p-3 flex flex-wrap gap-2 items-center">
              <span className="font-medium text-gray-900">{new Date(req.date).toDateString()}</span>
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{req.type}</span>
              <span className="text-xs text-gray-600">Current: {req.currentShift?.name}</span>
              {req.requestedShift && <span className="text-xs text-gray-600">Requested: {req.requestedShift?.name}</span>}
              {req.swapWithEmployee && <span className="text-xs text-gray-600">Swap with: {req.swapWithEmployee?.employeeId}</span>}
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                req.status === 'approved' ? 'bg-green-100 text-green-800' :
                req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {req.status}
              </span>
              {req.comments && <span className="text-xs text-gray-500">Note: {req.comments}</span>}
            </div>
          ))}
          {(myRequests || []).length === 0 && (
            <div className="text-sm text-gray-600">No requests yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyRoster

