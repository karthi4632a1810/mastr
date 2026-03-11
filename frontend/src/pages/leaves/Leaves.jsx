import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { Plus, Calendar, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'

const DEFAULT_FORM = {
  leaveType: '',
  startDate: '',
  endDate: '',
  partialDayType: 'full_day',
  halfDayType: '',
  hoursRequested: '',
  reason: '',
  applyLop: false,
}

const DEFAULT_INFO_RESPONSE = {
  response: '',
}

const DEFAULT_REASONS = {
  SL: 'Medical leave - will attach supporting proof if needed.',
  CL: 'Personal/urgent work - requesting casual leave.',
  EL: 'Planned leave as per schedule.',
  MAT: 'Maternity leave request.',
  PAT: 'Paternity leave request.',
}

const formatDateInput = (value) => value ? new Date(value).toISOString().slice(0, 10) : ''

const Leaves = () => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null) // for HR rejection modal
  const [editingRequest, setEditingRequest] = useState(null)
  const [formValues, setFormValues] = useState(DEFAULT_FORM)
  const [supportingFile, setSupportingFile] = useState(null)
  const [formError, setFormError] = useState('')
  const [serverSuggestions, setServerSuggestions] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [infoResponseModal, setInfoResponseModal] = useState(null)
  const [infoResponse, setInfoResponse] = useState('')
  const queryClient = useQueryClient()

  const { data: leaveRequests, isLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: async () => {
      const response = await api.get('/leaves/requests')
      return response.data?.data || []
    },
  })

  const { data: leaveTypes } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const response = await api.get('/leaves/types')
      return response.data?.data || []
    },
  })

  const { data: leaveBalance } = useQuery({
    queryKey: ['leave-balance'],
    queryFn: async () => {
      const response = await api.get('/leaves/balance')
      return response.data?.data || []
    },
  })

  const leaveRequestList = leaveRequests || []
  const leaveTypeOptions = leaveTypes?.map(type => ({ value: type._id, label: type.name })) || []
  const selectedType = leaveTypes?.find(type => type._id === formValues.leaveType)
  const selectedBalance = leaveBalance?.find(b => b.leaveType._id === formValues.leaveType)
  const requiresDocument = selectedType?.rules?.usage?.requiresDocument

  const applyMutation = useMutation({
    mutationFn: async (formData) => api.post('/leaves/apply', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests'])
      queryClient.invalidateQueries(['leave-balance'])
      setShowForm(false)
      setEditingRequest(null)
      setFormValues(DEFAULT_FORM)
      setSupportingFile(null)
      setServerSuggestions(null)
      showToast('Leave request submitted successfully', 'success')
    },
    onError: (error) => {
      setServerSuggestions(error.response?.data?.suggestions || null)
      showToast(error.response?.data?.message || 'Failed to submit leave request', 'error')
    },
  })

  const updateOwnMutation = useMutation({
    mutationFn: async ({ id, formData }) => api.put(`/leaves/requests/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests'])
      queryClient.invalidateQueries(['leave-balance'])
      setShowForm(false)
      setEditingRequest(null)
      setFormValues(DEFAULT_FORM)
      setSupportingFile(null)
      setServerSuggestions(null)
      showToast('Leave request updated successfully', 'success')
    },
    onError: (error) => {
      setServerSuggestions(error.response?.data?.suggestions || null)
      showToast(error.response?.data?.message || 'Failed to update leave request', 'error')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async (id) => api.put(`/leaves/requests/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests'])
      queryClient.invalidateQueries(['leave-balance'])
      showToast('Leave request cancelled', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Unable to cancel leave request', 'error')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }) => api.put(`/leaves/requests/${id}/status`, { status, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests'])
      setSelectedRequest(null)
      showToast('Leave request updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update leave request', 'error')
    },
  })

  const respondToInfoMutation = useMutation({
    mutationFn: async ({ id, response }) => api.put(`/leaves/requests/${id}/respond`, { response }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leave-requests'])
      setInfoResponseModal(null)
      setInfoResponse('')
      showToast('Response submitted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit response', 'error')
    },
  })

  const handleLeaveTypeChange = (value) => {
    const type = leaveTypes?.find(t => t._id === value)
    const autoReason = type?.rules?.usage?.defaultReason || DEFAULT_REASONS[type?.category]
    setFormValues((prev) => ({
      ...prev,
      leaveType: value,
      reason: prev.reason || autoReason || ''
    }))
  }

  const resetForm = () => {
    setFormValues(DEFAULT_FORM)
    setSupportingFile(null)
    setFormError('')
    setServerSuggestions(null)
  }

  const handleOpenNew = () => {
    resetForm()
    setEditingRequest(null)
    setShowForm(true)
  }

  const handleEdit = (request) => {
    setEditingRequest(request)
    setFormValues({
      leaveType: request.leaveType?._id || '',
      startDate: formatDateInput(request.startDate),
      endDate: formatDateInput(request.endDate),
      partialDayType: request.partialDayType || (request.isHalfDay ? 'half_day' : 'full_day'),
      halfDayType: request.halfDayType || '',
      hoursRequested: request.hoursRequested || '',
      reason: request.reason || '',
      applyLop: request.lopApplied || false,
    })
    setSupportingFile(null)
    setFormError('')
    setServerSuggestions(null)
    setShowForm(true)
  }

  const handleCancel = (request) => {
    if (window.confirm('Cancel this leave request?')) {
      cancelMutation.mutate(request._id)
    }
  }

  const preview = useMemo(() => {
    if (!formValues.startDate || !formValues.endDate) return null
    const start = new Date(formValues.startDate)
    const end = new Date(formValues.endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null

    let working = 0
    const cursor = new Date(start)
    while (cursor <= end) {
      const day = cursor.getDay()
      if (day !== 0 && day !== 6) working += 1
      cursor.setDate(cursor.getDate() + 1)
    }

    let appliedDays = working
    if (formValues.partialDayType === 'half_day') {
      appliedDays = 0.5
    } else if (formValues.partialDayType === 'hourly' && formValues.hoursRequested) {
      appliedDays = Math.min(Number(formValues.hoursRequested) / 8, 1)
    }

    return { working, appliedDays: Number(appliedDays.toFixed(2)) }
  }, [formValues.startDate, formValues.endDate, formValues.partialDayType, formValues.hoursRequested])

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    setServerSuggestions(null)

    if (!formValues.leaveType || !formValues.startDate || !formValues.endDate || !formValues.reason) {
      setFormError('Please fill all required fields.')
      return
    }

    const fd = new FormData()
    fd.append('leaveType', formValues.leaveType)
    fd.append('startDate', formValues.startDate)
    fd.append('endDate', formValues.endDate)
    fd.append('reason', formValues.reason)
    fd.append('partialDayType', formValues.partialDayType)
    fd.append('applyLop', formValues.applyLop)
    if (formValues.partialDayType === 'half_day') {
      fd.append('halfDayType', formValues.halfDayType || '')
    }
    if (formValues.partialDayType === 'hourly') {
      fd.append('hoursRequested', formValues.hoursRequested || 0)
    }
    if (supportingFile) {
      fd.append('supportingDocument', supportingFile)
    }

    if (editingRequest) {
      updateOwnMutation.mutate({ id: editingRequest._id, formData: fd })
    } else {
      applyMutation.mutate(fd)
    }
  }

  const handleApproveReject = (request, status, rejectionReason = '') => {
    updateStatusMutation.mutate({ id: request._id, status, rejectionReason })
  }

  const columns = [
    {
      key: 'leaveType',
      header: 'Leave Type',
      render: (value, row) => {
        if (!row) return '-'
        return row.leaveType?.name || value || '-'
      }
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (value, row) => {
        if (!row) return '-'
        const startDate = row.startDate
        const endDate = row.endDate
        if (!startDate || !endDate) return '-'
        try {
          return (
            <div>
              <div>{new Date(startDate).toLocaleDateString()}</div>
              <div className="text-xs text-gray-500">to {new Date(endDate).toLocaleDateString()}</div>
            </div>
          )
        } catch (error) {
          return '-'
        }
      }
    },
    {
      key: 'days',
      header: 'Days',
      render: (value, row) => {
        if (!row) return '-'
        const days = row.days || value || 0
        const partialDayType = row.partialDayType || ''
        const dayLabel = partialDayType === 'half_day' ? '(Half Day)' : partialDayType === 'hourly' ? '(Hourly)' : ''
        return `${days} ${dayLabel}`
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
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium inline-block w-fit ${
              status === 'approved' ? 'bg-green-100 text-green-800' :
              status === 'rejected' ? 'bg-red-100 text-red-800' :
              status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
              status === 'info_requested' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {status === 'info_requested' ? 'Info Requested' : status}
            </span>
            {status === 'info_requested' && row.infoRequests?.length > 0 && (
              <span className="text-xs text-blue-600">
                {row.infoRequests[row.infoRequests.length - 1]?.message?.slice(0, 30)}...
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (value, row) => {
        if (!row) return '-'
        const reason = row.reason || value || '-'
        return <div className="max-w-xs truncate">{reason}</div>
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => {
        if (!row) return '-'
        if (user?.role === 'admin' || user?.role === 'hr') {
          if (row.status === 'pending') {
            return (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleApproveReject(row, 'approved')}
                  className="text-green-600 hover:text-green-800 active:text-green-900 text-sm font-medium min-h-[44px] px-3 py-2"
                >
                  Approve
                </button>
                <button
                  onClick={() => setSelectedRequest(row)}
                  className="text-red-600 hover:text-red-800 active:text-red-900 text-sm font-medium min-h-[44px] px-3 py-2"
                >
                  Reject
                </button>
              </div>
            )
          }
        } else if (user?.role === 'employee') {
          if (row.status === 'pending') {
            return (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(row)}
                  className="text-primary-600 hover:text-primary-800 active:text-primary-900 text-sm font-medium min-h-[44px] px-3 py-2"
                >
                  Modify
                </button>
                <button
                  onClick={() => handleCancel(row)}
                  className="text-red-600 hover:text-red-800 active:text-red-900 text-sm font-medium min-h-[44px] px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            )
          }
          if (row.status === 'info_requested') {
            return (
              <div className="flex space-x-2">
                <button
                  onClick={() => setInfoResponseModal(row)}
                  className="text-blue-600 hover:text-blue-800 active:text-blue-900 text-sm font-medium min-h-[44px] px-3 py-2"
                >
                  Respond
                </button>
                <button
                  onClick={() => handleCancel(row)}
                  className="text-red-600 hover:text-red-800 active:text-red-900 text-sm font-medium min-h-[44px] px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            )
          }
        }
        return '-'
      }
    },
  ]

  const calendarDays = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
    const cells = []
    const offset = start.getDay()
    for (let i = 0; i < offset; i++) cells.push(null)

    for (let day = 1; day <= end.getDate(); day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      const match = leaveRequestList.find(req => {
        const s = new Date(req.startDate)
        const e = new Date(req.endDate)
        return s <= date && e >= date
      })
      cells.push({
        date,
        status: match?.status || null
      })
    }
    return cells
  }, [currentMonth, leaveRequestList])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Apply and manage your leave requests</p>
        </div>
        {user?.role === 'employee' && (
          <Button onClick={handleOpenNew}>
            <Plus className="h-4 w-4 mr-2" />
            {editingRequest ? 'Update Leave' : 'Apply Leave'}
          </Button>
        )}
      </div>

      {/* Leave Balance */}
      {user?.role === 'employee' && leaveBalance && leaveBalance.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Leave Balance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaveBalance.map((balance) => (
              <div key={balance.leaveType._id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{balance.leaveType.name}</span>
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used: {balance.used} days</span>
                  <span className={`font-semibold ${balance.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Balance: {balance.balance} days
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Pending: {balance.pending} days
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Available now: {balance.available} days
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar view */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 rounded hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 rounded hover:bg-gray-100">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="flex space-x-3 text-xs text-gray-600">
            <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-400"></span><span>Pending</span></span>
            <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-500"></span><span>Approved</span></span>
            <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-500"></span><span>Rejected</span></span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
            <div key={d} className="font-semibold text-gray-700">{d}</div>
          ))}
          {calendarDays.map((cell, idx) => cell ? (
            <div
              key={cell.date.toISOString()}
              className={`p-2 rounded border text-sm ${
                cell.status === 'approved' ? 'bg-green-100 border-green-400' :
                cell.status === 'rejected' ? 'bg-red-100 border-red-400' :
                cell.status === 'pending' ? 'bg-yellow-100 border-yellow-400' :
                'bg-white border-gray-200'
              }`}
            >
              <div className="font-semibold text-gray-800">{cell.date.getDate()}</div>
              <div className="text-[10px] text-gray-600 capitalize">{cell.status || ''}</div>
            </div>
          ) : (
            <div key={`empty-${idx}`} className="p-2" />
          ))}
        </div>
      </div>

      {user?.role === 'employee' && (
        <Modal
          isOpen={showForm}
          onClose={() => { setShowForm(false); setEditingRequest(null) }}
          title={editingRequest ? 'Modify Leave Request' : 'Apply for Leave'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && <div className="bg-red-50 text-red-700 p-2 rounded text-sm">{formError}</div>}
            {serverSuggestions && (
              <div className="bg-amber-50 text-amber-800 p-2 rounded text-sm space-y-1">
                <div>{serverSuggestions.available !== undefined ? `Available balance: ${serverSuggestions.available} day(s)` : 'Balance insufficient.'}</div>
                {serverSuggestions.required && <div>Requested: {serverSuggestions.required} day(s)</div>}
                {serverSuggestions.alternatives?.length > 0 && (
                  <div>
                    Alternatives with balance:
                    <ul className="list-disc list-inside">
                      {serverSuggestions.alternatives.map((alt) => (
                        <li key={alt.leaveType._id}>{alt.leaveType.name} ({alt.available} day(s) free)</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <Select
              label="Leave Type"
              name="leaveType"
              required
              value={formValues.leaveType}
              onChange={(e) => handleLeaveTypeChange(e.target.value)}
              options={leaveTypeOptions}
              placeholder="Select Leave Type"
            />
            {selectedBalance && (
              <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded border">
                <div>Available: {selectedBalance.available} day(s) | Pending: {selectedBalance.pending} | Used: {selectedBalance.used}</div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date"
                name="startDate"
                type="date"
                required
                value={formValues.startDate}
                onChange={(e) => setFormValues({ ...formValues, startDate: e.target.value })}
              />
              <Input
                label="End Date"
                name="endDate"
                type="date"
                required
                value={formValues.endDate}
                onChange={(e) => setFormValues({ ...formValues, endDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Day Type"
                name="partialDayType"
                value={formValues.partialDayType}
                onChange={(e) => setFormValues({ ...formValues, partialDayType: e.target.value })}
                options={[
                  { value: 'full_day', label: 'Full Day' },
                  { value: 'half_day', label: 'Half Day' },
                  { value: 'hourly', label: 'Hourly' }
                ]}
              />
              <Select
                label="Half Day Type"
                name="halfDayType"
                value={formValues.halfDayType}
                onChange={(e) => setFormValues({ ...formValues, halfDayType: e.target.value })}
                disabled={formValues.partialDayType !== 'half_day'}
                options={[
                  { value: '', label: 'Select half' },
                  { value: 'first_half', label: 'First Half' },
                  { value: 'second_half', label: 'Second Half' }
                ]}
              />
              <Input
                label="Hours (if hourly)"
                name="hoursRequested"
                type="number"
                step="0.25"
                min="0"
                value={formValues.hoursRequested}
                onChange={(e) => setFormValues({ ...formValues, hoursRequested: e.target.value })}
                disabled={formValues.partialDayType !== 'hourly'}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formValues.applyLop}
                  onChange={(e) => setFormValues({ ...formValues, applyLop: e.target.checked })}
                />
                <span>Apply as LOP if balance insufficient</span>
              </label>
              {requiresDocument && (
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="file" accept=".pdf,.jpg,.png,.jpeg" onChange={(e) => setSupportingFile(e.target.files?.[0] || null)} />
                  <span>Supporting document required</span>
                </label>
              )}
              {!requiresDocument && (
                <label className="flex items-center space-x-2 text-sm text-gray-700">
                  <input type="file" accept=".pdf,.jpg,.png,.jpeg" onChange={(e) => setSupportingFile(e.target.files?.[0] || null)} />
                  <span>Attach document (optional)</span>
                </label>
              )}
            </div>
            {preview && (
              <div className="bg-blue-50 text-blue-800 p-2 rounded text-sm flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Working days (excluding weekends): {preview.working}</span>
                <span className="ml-2">Will apply for: {preview.appliedDays} day(s)</span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                name="reason"
                required
                className="input"
                rows="3"
                placeholder="Enter reason for leave..."
                value={formValues.reason}
                onChange={(e) => setFormValues({ ...formValues, reason: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setShowForm(false); setEditingRequest(null) }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={applyMutation.isLoading || updateOwnMutation.isLoading}
              >
                {editingRequest ? 'Update Request' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reject Leave Modal */}
      <Modal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="Reject Leave Request"
      >
        <form onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.target)
          handleApproveReject(selectedRequest, 'rejected', formData.get('rejectionReason'))
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="rejectionReason"
              required
              className="input"
              rows="3"
              placeholder="Enter reason for rejection..."
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSelectedRequest(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={updateStatusMutation.isLoading}
            >
              Reject Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Info Response Modal */}
      <Modal
        isOpen={!!infoResponseModal}
        onClose={() => { setInfoResponseModal(null); setInfoResponse('') }}
        title="Respond to Information Request"
      >
        <div className="space-y-4">
          {infoResponseModal?.infoRequests?.length > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-800">HR/Manager asked:</p>
              <p className="text-sm text-blue-700 mt-1">
                {infoResponseModal.infoRequests[infoResponseModal.infoRequests.length - 1]?.message}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Response <span className="text-red-500">*</span>
            </label>
            <textarea
              value={infoResponse}
              onChange={(e) => setInfoResponse(e.target.value)}
              className="input"
              rows="4"
              placeholder="Provide the requested information..."
              required
            />
          </div>
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setInfoResponseModal(null); setInfoResponse('') }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => respondToInfoMutation.mutate({ id: infoResponseModal._id, response: infoResponse })}
              isLoading={respondToInfoMutation.isLoading}
              disabled={!infoResponse.trim()}
            >
              Submit Response
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Requests Table */}
      <div className="card">
        <Table
          columns={columns}
          data={leaveRequestList}
          isLoading={isLoading}
          emptyMessage="No leave requests found"
        />
      </div>
    </div>
  )
}

export default Leaves
