import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import Select from '../../components/Select'
import Input from '../../components/Input'
import { useToast } from '../../contexts/ToastContext'

const InterviewScheduleModal = ({ isOpen, onClose, candidate }) => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    round: 'other',
    scheduledDate: '',
    scheduledTime: '',
    mode: 'in_person',
    location: '',
    meetingLink: '',
    interviewers: [],
    notifyCandidate: false
  })
  const [errors, setErrors] = useState({})

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        const response = await api.get('/users')
        return response.data.data || []
      } catch (error) {
        return []
      }
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/recruitment/candidates/${candidate._id}/interviews`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['candidate', candidate._id])
      queryClient.invalidateQueries(['candidates'])
      showToast('Interview scheduled successfully', 'success')
      handleClose()
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to schedule interview', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const handleClose = () => {
    setFormData({
      round: 'other',
      scheduledDate: '',
      scheduledTime: '',
      mode: 'in_person',
      location: '',
      meetingLink: '',
      interviewers: [],
      notifyCandidate: false
    })
    setErrors({})
    onClose()
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleInterviewerChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
    setFormData(prev => ({
      ...prev,
      interviewers: selectedOptions
    }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.scheduledDate) newErrors.scheduledDate = 'Date is required'
    if (!formData.interviewers || formData.interviewers.length === 0) {
      newErrors.interviewers = 'At least one interviewer is required'
    }
    if (formData.mode === 'video' && !formData.meetingLink.trim()) {
      newErrors.meetingLink = 'Meeting link is required for video interviews'
    }
    if (formData.mode === 'in_person' && !formData.location.trim()) {
      newErrors.location = 'Location is required for in-person interviews'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) {
      showToast('Please fix the errors in the form', 'error')
      return
    }

    scheduleMutation.mutate(formData)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Schedule Interview"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Candidate:</strong> {candidate?.firstName} {candidate?.lastName}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Position:</strong> {candidate?.jobOpening?.title}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Interview Round"
            name="round"
            value={formData.round}
            onChange={handleChange}
            required
            options={[
              { value: 'technical', label: 'Technical' },
              { value: 'hr', label: 'HR' },
              { value: 'manager', label: 'Manager' },
              { value: 'cultural', label: 'Cultural Fit' },
              { value: 'final', label: 'Final' },
              { value: 'other', label: 'Other' }
            ]}
          />

          <Select
            label="Interview Mode"
            name="mode"
            value={formData.mode}
            onChange={handleChange}
            required
            options={[
              { value: 'in_person', label: 'In-Person' },
              { value: 'video', label: 'Video' },
              { value: 'phone', label: 'Phone' }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Interview Date"
            name="scheduledDate"
            type="date"
            value={formData.scheduledDate}
            onChange={handleChange}
            required
            error={errors.scheduledDate}
            min={new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Interview Time"
            name="scheduledTime"
            type="time"
            value={formData.scheduledTime}
            onChange={handleChange}
          />
        </div>

        {formData.mode === 'in_person' && (
          <Input
            label="Location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            error={errors.location}
            placeholder="Interview location/address"
          />
        )}

        {formData.mode === 'video' && (
          <Input
            label="Meeting Link"
            name="meetingLink"
            type="url"
            value={formData.meetingLink}
            onChange={handleChange}
            required
            error={errors.meetingLink}
            placeholder="Zoom/Teams/Google Meet link"
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Interviewers <span className="text-red-500">*</span>
          </label>
          <select
            name="interviewers"
            multiple
            value={formData.interviewers}
            onChange={handleInterviewerChange}
            required
            className={`input ${errors.interviewers ? 'border-red-500 focus:ring-red-500' : ''}`}
            size="4"
          >
            {users?.map(user => (
              <option key={user._id} value={user._id}>
                {user.email}
              </option>
            ))}
          </select>
          {errors.interviewers && (
            <p className="mt-1 text-sm text-red-600">{errors.interviewers}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple interviewers</p>
        </div>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="notifyCandidate"
            checked={formData.notifyCandidate}
            onChange={handleChange}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">Notify candidate via email</span>
        </label>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={scheduleMutation.isLoading}
          >
            Schedule Interview
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default InterviewScheduleModal

