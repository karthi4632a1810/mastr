import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { Save, CheckCircle, Star, AlertCircle, Clock, Lock } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'

const SelfAssessmentForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [goalRatings, setGoalRatings] = useState([])
  const [overallComments, setOverallComments] = useState('')
  const [performanceCycleId, setPerformanceCycleId] = useState(null)

  const { data: selfAssessment, isLoading } = useQuery({
    queryKey: ['selfAssessment', id],
    queryFn: async () => {
      const params = id ? { performanceCycleId: id } : {}
      const response = await api.get('/self-assessments/me', { params })
      return response.data.data
    },
    onSuccess: (data) => {
      if (data) {
        setPerformanceCycleId(data.performanceCycle?._id)
        setGoalRatings(data.goalRatings || [])
        setOverallComments(data.overallComments || '')
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/self-assessments/me/${selfAssessment._id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['selfAssessment'])
      showToast('Self-assessment saved successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to save assessment', 'error')
    }
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/self-assessments/me/${selfAssessment._id}/submit`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['selfAssessment'])
      showToast('Self-assessment submitted successfully', 'success')
      // Refresh to show read-only view
      queryClient.refetchQueries(['selfAssessment', id])
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit assessment', 'error')
    }
  })

  const handleRatingChange = (goalIndex, rating) => {
    const updated = [...goalRatings]
    updated[goalIndex] = {
      ...updated[goalIndex],
      rating: parseInt(rating)
    }
    setGoalRatings(updated)
  }

  const handleCommentChange = (goalIndex, comment) => {
    const updated = [...goalRatings]
    updated[goalIndex] = {
      ...updated[goalIndex],
      comment
    }
    setGoalRatings(updated)
  }

  const handleSave = () => {
    if (!selfAssessment) return
    
    updateMutation.mutate({
      goalRatings,
      overallComments
    })
  }

  const handleSubmit = () => {
    if (!selfAssessment) return

    // Validate all goals are rated
    const unratedGoals = goalRatings.filter(gr => !gr.rating || gr.rating < 1 || gr.rating > 5)
    if (unratedGoals.length > 0) {
      showToast('Please rate all goals before submitting', 'error')
      return
    }

    submitMutation.mutate()
  }

  const calculateWeightedScore = () => {
    if (!goalRatings || goalRatings.length === 0) return 0

    let totalWeight = 0
    let weightedSum = 0

    goalRatings.forEach(gr => {
      const weight = gr.goal?.weightage || 0
      const rating = gr.rating || 0
      weightedSum += rating * weight
      totalWeight += weight
    })

    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }

  const isReadOnly = selfAssessment?.status === 'submitted'
  const canEdit = selfAssessment?.status === 'draft' || selfAssessment?.status === 'reopened'
  const weightedScore = calculateWeightedScore()

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

  if (!selfAssessment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Performance Cycle</h2>
        <p className="text-gray-600">There is no active performance cycle for self-assessment at this time.</p>
      </div>
    )
  }

  // Check if self-assessment window is open
  const cycle = selfAssessment.performanceCycle
  const now = new Date()
  const window = cycle?.workflowWindows?.selfAssessment
  const windowOpen = !window?.enabled || (
    (!window.startDate || new Date(window.startDate) <= now) &&
    (!window.endDate || new Date(window.endDate) >= now)
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Self-Assessment</h1>
        <p className="text-gray-600 mt-1">
          {cycle?.name} - Rate your performance against each goal
        </p>
      </div>

      {isReadOnly && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Assessment Submitted</h3>
              <p className="text-sm text-blue-700">
                This assessment was submitted on {new Date(selfAssessment.submittedAt).toLocaleString()}. 
                It is now read-only. Contact HR if you need to make changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {!windowOpen && !isReadOnly && (
        <div className="card mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-semibold text-yellow-900">Self-Assessment Window Closed</h3>
              <p className="text-sm text-yellow-700">
                {window?.endDate 
                  ? `The self-assessment window closed on ${new Date(window.endDate).toLocaleDateString()}.`
                  : 'The self-assessment window is not currently open.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Weighted Score Display */}
      {isReadOnly && (
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weighted Self-Score</h2>
              <p className="text-sm text-gray-600">Calculated based on your ratings and goal weightages</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-primary-600">
                {weightedScore.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">out of 5.00</div>
            </div>
          </div>
        </div>
      )}

      {/* Goals Rating Section */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Goal Ratings</h2>
        <p className="text-sm text-gray-600 mb-6">
          Rate your performance for each goal on a scale of 1-5, where 1 is Below Expectations and 5 is Exceeds Expectations.
        </p>

        {goalRatings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No goals assigned for this performance cycle</p>
          </div>
        ) : (
          <div className="space-y-6">
            {goalRatings.map((goalRating, index) => {
              const goal = goalRating.goal
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {index + 1}. {goal?.title}
                        </h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {getCategoryLabel(goal?.category)}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          {goal?.weightage}% weightage
                        </span>
                      </div>
                      {goal?.description && (
                        <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                      )}
                      {goal?.successCriteria && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Success Criteria:</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{goal.successCriteria}</p>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        Due: {goal?.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pt-4 border-t border-gray-200">
                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Rating <span className="text-red-600">*</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => !isReadOnly && handleRatingChange(index, rating)}
                            disabled={isReadOnly}
                            className={`w-12 h-12 rounded-lg flex items-center justify-center font-semibold transition-all ${
                              goalRating.rating === rating
                                ? 'bg-primary-600 text-white scale-110'
                                : isReadOnly
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={
                              rating === 1 ? 'Below Expectations' :
                              rating === 2 ? 'Partially Meets Expectations' :
                              rating === 3 ? 'Meets Expectations' :
                              rating === 4 ? 'Exceeds Expectations' :
                              'Far Exceeds Expectations'
                            }
                          >
                            {goalRating.rating === rating ? (
                              <Star className="h-6 w-6 fill-current" />
                            ) : (
                              rating
                            )}
                          </button>
                        ))}
                      </div>
                      {goalRating.rating && (
                        <p className="text-xs text-gray-500 mt-2">
                          {
                            goalRating.rating === 1 ? 'Below Expectations' :
                            goalRating.rating === 2 ? 'Partially Meets Expectations' :
                            goalRating.rating === 3 ? 'Meets Expectations' :
                            goalRating.rating === 4 ? 'Exceeds Expectations' :
                            'Far Exceeds Expectations'
                          }
                        </p>
                      )}
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Comments
                      </label>
                      <textarea
                        value={goalRating.comment || ''}
                        onChange={(e) => !isReadOnly && handleCommentChange(index, e.target.value)}
                        disabled={isReadOnly}
                        rows={4}
                        className="input"
                        placeholder="Provide details about your achievement or any challenges faced..."
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Overall Comments */}
      <div className="card mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Overall Comments</h2>
        <textarea
          value={overallComments}
          onChange={(e) => !isReadOnly && setOverallComments(e.target.value)}
          disabled={isReadOnly}
          rows={6}
          className="input"
          placeholder="Provide overall comments about your performance, achievements, areas for improvement, or any other relevant information..."
        />
        <p className="mt-2 text-xs text-gray-500">
          These comments will be shared with your manager and HR
        </p>
      </div>

      {/* Action Buttons */}
      {!isReadOnly && windowOpen && (
        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={handleSave}
            isLoading={updateMutation.isLoading}
          >
            Save Draft
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={submitMutation.isLoading}
            disabled={goalRatings.some(gr => !gr.rating || gr.rating < 1 || gr.rating > 5)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Submit Assessment
          </Button>
        </div>
      )}

      {!isReadOnly && !windowOpen && (
        <div className="card bg-gray-50">
          <p className="text-sm text-gray-600 text-center">
            Self-assessment cannot be submitted outside the assessment window.
          </p>
        </div>
      )}
    </div>
  )
}

export default SelfAssessmentForm

