import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import Select from '../../components/Select'
import Input from '../../components/Input'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

const StageChangeModal = ({ isOpen, onClose, candidate, currentStage }) => {
  const { showToast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [stage, setStage] = useState('')
  const [comments, setComments] = useState('')
  const [notifyCandidate, setNotifyCandidate] = useState(false)
  const [notifyInterviewer, setNotifyInterviewer] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [showOverride, setShowOverride] = useState(false)

  const finalStages = ['hired', 'rejected']
  const isFinalStage = finalStages.includes(currentStage)
  const willBeFinalStage = finalStages.includes(stage)

  const stageOptions = [
    { value: 'applied', label: 'Applied' },
    { value: 'screening', label: 'Screening' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'interview', label: 'Interview' },
    { value: 'hr_interview', label: 'HR Interview' },
    { value: 'manager_round', label: 'Manager Round' },
    { value: 'offer', label: 'Offer' },
    { value: 'hired', label: 'Hired' },
    { value: 'rejected', label: 'Rejected' }
  ]

  const updateStageMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/recruitment/candidates/${candidate._id}/stage`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['candidate', candidate._id])
      queryClient.invalidateQueries(['candidates'])
      showToast('Stage updated successfully', 'success')
      handleClose()
    },
    onError: (error) => {
      if (error.response?.data?.requiresOverride && user?.role === 'admin') {
        setShowOverride(true)
      } else {
        showToast(error.response?.data?.message || 'Failed to update stage', 'error')
      }
    }
  })

  const handleClose = () => {
    setStage('')
    setComments('')
    setNotifyCandidate(false)
    setNotifyInterviewer(false)
    setOverrideReason('')
    setShowOverride(false)
    onClose()
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!stage) {
      showToast('Please select a stage', 'error')
      return
    }

    if (stage === 'rejected' && !comments.trim()) {
      showToast('Comments are required when rejecting a candidate', 'error')
      return
    }

    if (showOverride && !overrideReason.trim()) {
      showToast('Override reason is required', 'error')
      return
    }

    const data = {
      stage,
      comments: comments.trim(),
      notifyCandidate,
      notifyInterviewer,
      ...(showOverride && { overrideReason: overrideReason.trim() })
    }

    updateStageMutation.mutate(data)
  }

  const handleStageChange = (e) => {
    const newStage = e.target.value
    setStage(newStage)
    
    // Reset override if moving away from final stage manipulation
    if (!finalStages.includes(newStage) && !isFinalStage) {
      setShowOverride(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Candidate Stage"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Current Stage:</strong> {stageOptions.find(s => s.value === currentStage)?.label || currentStage}
          </p>
        </div>

        {isFinalStage && user?.role !== 'admin' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              This candidate is in a final stage. Only Admin can change the stage.
            </p>
          </div>
        )}

        {showOverride && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              You are overriding a final stage restriction. Please provide a reason.
            </p>
            <Input
              label="Override Reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              required
              placeholder="Explain why this override is necessary"
            />
          </div>
        )}

        <Select
          label="New Stage"
          value={stage}
          onChange={handleStageChange}
          required
          options={[
            { value: '', label: 'Select Stage' },
            ...stageOptions.filter(opt => opt.value !== currentStage)
          ]}
          disabled={isFinalStage && user?.role !== 'admin'}
        />

        {stage === 'rejected' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              required
              rows={4}
              className="input"
              placeholder="Reason for rejection..."
            />
          </div>
        )}

        {stage && stage !== 'rejected' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comments (Optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="input"
              placeholder="Add any notes about this stage change..."
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={notifyCandidate}
              onChange={(e) => setNotifyCandidate(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Notify candidate via email</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={notifyInterviewer}
              onChange={(e) => setNotifyInterviewer(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Notify interviewer/manager</span>
          </label>
        </div>

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
            isLoading={updateStageMutation.isLoading}
            disabled={isFinalStage && user?.role !== 'admin'}
          >
            Update Stage
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default StageChangeModal

