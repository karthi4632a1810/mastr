import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { ArrowLeft, Save, Lock, Unlock, CheckCircle, AlertCircle, Star, Eye } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'

const PerformanceReviewDetail = () => {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')

  const [formData, setFormData] = useState({
    finalRating: {
      ratingType: 'numeric',
      numeric: null,
      grade: null
    },
    hrComments: '',
    justification: '',
    status: 'pending',
    visibleToEmployee: false
  })

  const { data: reviewData, isLoading } = useQuery({
    queryKey: ['performanceReview', id],
    queryFn: async () => {
      const response = await api.get(`/performance-reviews/${id}`)
      return response.data.data
    },
    onSuccess: (data) => {
      if (data) {
        setFormData({
          finalRating: {
            ratingType: data.finalRating?.ratingType || 'numeric',
            numeric: data.finalRating?.numeric || null,
            grade: data.finalRating?.grade || null
          },
          hrComments: data.hrComments || '',
          justification: data.justification || '',
          status: data.status || 'pending',
          visibleToEmployee: data.visibleToEmployee || false
        })
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/performance-reviews/${id}/rating`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['performanceReview', id])
      queryClient.invalidateQueries(['performanceReviews'])
      showToast('Rating updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update rating', 'error')
    }
  })

  const finalizeMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/performance-reviews/${id}/finalize`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['performanceReview', id])
      queryClient.invalidateQueries(['performanceReviews'])
      showToast('Performance review finalized successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to finalize review', 'error')
    }
  })

  const unlockMutation = useMutation({
    mutationFn: async (reason) => {
      const response = await api.put(`/performance-reviews/${id}/unlock`, { reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['performanceReview', id])
      queryClient.invalidateQueries(['performanceReviews'])
      showToast('Review unlocked successfully', 'success')
      setShowUnlockModal(false)
      setUnlockReason('')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to unlock review', 'error')
    }
  })

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const handleFinalize = () => {
    if (!formData.finalRating.numeric && !formData.finalRating.grade) {
      showToast('Please enter a final rating before finalizing', 'error')
      return
    }
    finalizeMutation.mutate({ visibleToEmployee: formData.visibleToEmployee })
  }

  const handleUnlock = () => {
    if (!unlockReason.trim()) {
      showToast('Please provide a reason for unlocking', 'error')
      return
    }
    unlockMutation.mutate(unlockReason)
  }

  const getCategoryLabel = (category) => {
    const categories = {
      productivity: 'Productivity',
      leadership: 'Leadership',
      behavioural: 'Behavioural',
      technical: 'Technical'
    }
    return categories[category] || category
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!reviewData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Performance review not found</p>
        <Link to="/performance/reviews" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Reviews
        </Link>
      </div>
    )
  }

  const { goals, selfAssessmentDetails, aggregatedRating, ...review } = reviewData
  const isLocked = review.isLocked && review.status === 'finalized'
  const canEdit = !isLocked

  return (
    <div>
      {/* Professional Header Banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-6 py-8 mb-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/performance/reviews">
              <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {review.employee?.firstName} {review.employee?.lastName}
              </h1>
              <p className="text-primary-100">
                {review.performanceCycle?.name} - Performance Review
              </p>
              <p className="text-primary-200 text-sm font-mono mt-1">Review ID: {review._id?.slice(-8) || id}</p>
            </div>
          </div>
          {isLocked && (
            <Button
              variant="secondary"
              onClick={() => setShowUnlockModal(true)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Unlock className="h-4 w-4 mr-2" />
              Unlock
            </Button>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Review Finalized</h3>
              <p className="text-sm text-blue-700">
                This review was finalized on {new Date(review.finalizedAt).toLocaleString()}. 
                It is locked and cannot be edited unless unlocked.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Goals Overview */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Assigned Goals</h2>
            {goals && goals.length > 0 ? (
              <div className="space-y-4">
                {goals.map((goal, index) => (
                  <div key={goal._id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {index + 1}. {goal.title}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {getCategoryLabel(goal.category)}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            {goal.weightage}% weightage
                          </span>
                        </div>
                        {goal.description && (
                          <p className="text-sm text-gray-600 mt-2">{goal.description}</p>
                        )}
                        {goal.successCriteria && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <strong>Success Criteria:</strong> {goal.successCriteria}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No goals assigned</p>
            )}
          </div>

          {/* Self-Assessment */}
          {selfAssessmentDetails && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Self-Assessment</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Weighted Self-Score</div>
                    <div className="text-2xl font-bold text-primary-600">
                      {selfAssessmentDetails.weightedScore?.toFixed(2) || 'N/A'} / 5.00
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Submitted: {selfAssessmentDetails.submittedAt 
                      ? new Date(selfAssessmentDetails.submittedAt).toLocaleDateString()
                      : 'Not submitted'}
                  </div>
                </div>

                {selfAssessmentDetails.goalRatings && selfAssessmentDetails.goalRatings.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900">Goal Ratings</h3>
                    {selfAssessmentDetails.goalRatings.map((gr, idx) => (
                      <div key={idx} className="border border-gray-200 rounded p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{gr.goal?.title}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              Weightage: {gr.goal?.weightage}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">{gr.rating} / 5</div>
                            <div className="text-xs text-gray-500">
                              {
                                gr.rating === 1 ? 'Below Expectations' :
                                gr.rating === 2 ? 'Partially Meets' :
                                gr.rating === 3 ? 'Meets Expectations' :
                                gr.rating === 4 ? 'Exceeds' :
                                'Far Exceeds'
                              }
                            </div>
                          </div>
                        </div>
                        {gr.comment && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                            <strong>Comment:</strong> {gr.comment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selfAssessmentDetails.overallComments && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-900 mb-2">Overall Comments</h3>
                    <div className="p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap">
                      {selfAssessmentDetails.overallComments}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manager Evaluation (placeholder - will be implemented in manager review story) */}
          {review.managerEvaluation && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Manager Evaluation</h2>
              <p className="text-gray-600">Manager evaluation data will be displayed here</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Final Rating Form */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Final Rating</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating Type
                </label>
                <Select
                  value={formData.finalRating.ratingType}
                  onChange={(e) => setFormData({
                    ...formData,
                    finalRating: {
                      ...formData.finalRating,
                      ratingType: e.target.value,
                      numeric: e.target.value === 'numeric' ? formData.finalRating.numeric : null,
                      grade: e.target.value === 'grade' ? formData.finalRating.grade : null
                    }
                  })}
                  disabled={!canEdit}
                  options={[
                    { value: 'numeric', label: 'Numeric (0-5)' },
                    { value: 'grade', label: 'Grade (A/B/C/D)' }
                  ]}
                />
              </div>

              {formData.finalRating.ratingType === 'numeric' ? (
                <Input
                  label="Final Rating (0-5)"
                  type="number"
                  value={formData.finalRating.numeric || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    finalRating: {
                      ...formData.finalRating,
                      numeric: parseFloat(e.target.value) || null
                    }
                  })}
                  disabled={!canEdit}
                  min="0"
                  max="5"
                  step="0.01"
                  placeholder="Enter rating (0.00 - 5.00)"
                />
              ) : (
                <Select
                  label="Final Grade"
                  value={formData.finalRating.grade || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    finalRating: {
                      ...formData.finalRating,
                      grade: e.target.value || null
                    }
                  })}
                  disabled={!canEdit}
                  options={[
                    { value: '', label: 'Select grade...' },
                    { value: 'A', label: 'A - Outstanding' },
                    { value: 'B', label: 'B - Exceeds Expectations' },
                    { value: 'C', label: 'C - Meets Expectations' },
                    { value: 'D', label: 'D - Below Expectations' }
                  ]}
                />
              )}

              {aggregatedRating !== null && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm text-blue-800">
                    <strong>Self-Assessment Score:</strong> {aggregatedRating.toFixed(2)} / 5.00
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HR Comments
                </label>
                <textarea
                  value={formData.hrComments}
                  onChange={(e) => setFormData({ ...formData, hrComments: e.target.value })}
                  disabled={!canEdit}
                  rows={4}
                  className="input"
                  placeholder="Add comments about the employee's performance..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Justification
                </label>
                <textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  disabled={!canEdit}
                  rows={3}
                  className="input"
                  placeholder="Provide justification for the final rating..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={!canEdit}
                  options={[
                    { value: 'pending', label: 'Pending' },
                    { value: 'needs_review', label: 'Needs Review' },
                    { value: 'pending_manager_feedback', label: 'Pending Manager Feedback' },
                    { value: 'finalized', label: 'Finalized' }
                  ]}
                />
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.visibleToEmployee}
                  onChange={(e) => setFormData({ ...formData, visibleToEmployee: e.target.checked })}
                  disabled={!canEdit}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Make visible to employee</span>
              </label>

              {canEdit && (
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="secondary"
                    onClick={handleSave}
                    isLoading={updateMutation.isLoading}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    onClick={handleFinalize}
                    isLoading={finalizeMutation.isLoading}
                    disabled={!formData.finalRating.numeric && !formData.finalRating.grade}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Finalize
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Review Info */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Review Information</h2>
            <dl className="space-y-3">
              {review.finalizedBy && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Finalized By</dt>
                  <dd className="text-gray-900">{review.finalizedBy?.email || '-'}</dd>
                  {review.finalizedAt && (
                    <dd className="text-xs text-gray-500 mt-1">
                      {new Date(review.finalizedAt).toLocaleString()}
                    </dd>
                  )}
                </div>
              )}
              {review.visibleToEmployee && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Visible to Employee</dt>
                  <dd className="text-green-600 font-medium">Yes</dd>
                  {review.visibleAt && (
                    <dd className="text-xs text-gray-500 mt-1">
                      Since {new Date(review.visibleAt).toLocaleDateString()}
                    </dd>
                  )}
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Unlock Modal */}
      <Modal
        isOpen={showUnlockModal}
        onClose={() => {
          setShowUnlockModal(false)
          setUnlockReason('')
        }}
        title="Unlock Performance Review"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to unlock this performance review? This will allow it to be edited again.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Unlocking <span className="text-red-600">*</span>
            </label>
            <textarea
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              rows={3}
              className="input"
              placeholder="Provide a reason for unlocking this review..."
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowUnlockModal(false)
                setUnlockReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnlock}
              isLoading={unlockMutation.isLoading}
              disabled={!unlockReason.trim()}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Unlock
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default PerformanceReviewDetail

