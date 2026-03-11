import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import Modal from '../../components/Modal'
import Button from '../../components/Button'
import Select from '../../components/Select'
import Input from '../../components/Input'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'

const InterviewFeedbackModal = ({ isOpen, onClose, candidate, interview }) => {
  const { showToast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    writtenComments: '',
    rating: '',
    technicalScore: '',
    communicationScore: '',
    cultureFitScore: '',
    recommendation: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (interview?.feedback) {
      setFormData({
        writtenComments: interview.feedback.writtenComments || '',
        rating: interview.feedback.rating || '',
        technicalScore: interview.feedback.technicalScore || '',
        communicationScore: interview.feedback.communicationScore || '',
        cultureFitScore: interview.feedback.cultureFitScore || '',
        recommendation: interview.feedback.recommendation || ''
      })
    }
  }, [interview])

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(
        `/recruitment/candidates/${candidate._id}/interviews/${interview._id}/feedback`,
        data
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['candidate', candidate._id])
      queryClient.invalidateQueries(['candidates'])
      showToast('Feedback submitted successfully', 'success')
      handleClose()
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit feedback', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const handleClose = () => {
    setFormData({
      writtenComments: '',
      rating: '',
      technicalScore: '',
      communicationScore: '',
      cultureFitScore: '',
      recommendation: ''
    })
    setErrors({})
    onClose()
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.recommendation) {
      newErrors.recommendation = 'Recommendation is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) {
      showToast('Please provide a recommendation', 'error')
      return
    }

    const feedbackData = {
      ...formData,
      rating: formData.rating ? parseInt(formData.rating) : null,
      technicalScore: formData.technicalScore ? parseFloat(formData.technicalScore) : null,
      communicationScore: formData.communicationScore ? parseFloat(formData.communicationScore) : null,
      cultureFitScore: formData.cultureFitScore ? parseFloat(formData.cultureFitScore) : null
    }

    submitFeedbackMutation.mutate(feedbackData)
  }

  const getRoundLabel = (round) => {
    const rounds = {
      technical: 'Technical',
      hr: 'HR',
      manager: 'Manager',
      cultural: 'Cultural Fit',
      final: 'Final',
      other: 'Other'
    }
    return rounds[round] || round
  }

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Submit Interview Feedback"
      size="lg"
    >
      {interview && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Candidate:</strong> {candidate?.firstName} {candidate?.lastName}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Round:</strong> {getRoundLabel(interview.round)}
          </p>
          <p className="text-sm text-blue-800">
            <strong>Scheduled:</strong> {formatDate(interview.scheduledDate)} {interview.scheduledTime && `at ${interview.scheduledTime}`}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Written Comments
          </label>
          <textarea
            name="writtenComments"
            value={formData.writtenComments}
            onChange={handleChange}
            rows={6}
            className="input"
            placeholder="Provide detailed feedback about the interview..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Overall Rating (1-5)
            </label>
            <Select
              name="rating"
              value={formData.rating}
              onChange={handleChange}
              placeholder="Select rating"
              options={[
                { value: '', label: 'Select rating (optional)' },
                { value: '1', label: '1 - Poor' },
                { value: '2', label: '2 - Below Average' },
                { value: '3', label: '3 - Average' },
                { value: '4', label: '4 - Good' },
                { value: '5', label: '5 - Excellent' }
              ]}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Structured Scores (0-10)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Technical Score"
              name="technicalScore"
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={formData.technicalScore}
              onChange={handleChange}
              placeholder="0-10"
            />
            <Input
              label="Communication Score"
              name="communicationScore"
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={formData.communicationScore}
              onChange={handleChange}
              placeholder="0-10"
            />
            <Input
              label="Culture Fit Score"
              name="cultureFitScore"
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={formData.cultureFitScore}
              onChange={handleChange}
              placeholder="0-10"
            />
          </div>
        </div>

        <div>
          <Select
            label="Recommendation"
            name="recommendation"
            value={formData.recommendation}
            onChange={handleChange}
            required
            error={errors.recommendation}
            options={[
              { value: '', label: 'Select recommendation' },
              { value: 'proceed', label: '✅ Proceed - Move to next stage' },
              { value: 'hold', label: '⏸️ Hold - Keep in current stage' },
              { value: 'reject', label: '❌ Reject - Remove from pipeline' }
            ]}
          />
          {errors.recommendation && (
            <p className="mt-1 text-sm text-red-600">{errors.recommendation}</p>
          )}
        </div>

        {interview?.feedback?.submittedAt && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Last updated:</strong> {new Date(interview.feedback.submittedAt).toLocaleString()}
            </p>
            {interview.feedback.submittedBy && (
              <p className="text-sm text-gray-600">
                <strong>Submitted by:</strong> {interview.feedback.submittedBy.email || 'Unknown'}
              </p>
            )}
          </div>
        )}

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
            isLoading={submitFeedbackMutation.isLoading}
          >
            {interview?.feedback?.submittedAt ? 'Update Feedback' : 'Submit Feedback'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default InterviewFeedbackModal

