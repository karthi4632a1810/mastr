import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { CheckCircle, Star, AlertCircle, Lock } from 'lucide-react'

const MyPerformanceReview = () => {
  const { data: review, isLoading } = useQuery({
    queryKey: ['myPerformanceReview'],
    queryFn: async () => {
      const response = await api.get('/performance-reviews/me/review')
      return response.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!review) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Performance Review Not Available</h2>
        <p className="text-gray-600">
          Your performance review is not yet available or has not been finalized and made visible.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Performance Review</h1>
        <p className="text-gray-600 mt-1">
          {review.performanceCycle?.name} - Final Performance Rating
        </p>
      </div>

      {review.isLocked && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">Review Finalized</h3>
              <p className="text-sm text-blue-700">
                This review was finalized on {new Date(review.finalizedAt).toLocaleString()}.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Final Rating */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Final Performance Rating</h2>
            <div className="flex items-center justify-center p-8 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg">
              <div className="text-center">
                {review.finalRating?.numeric !== null && review.finalRating?.numeric !== undefined ? (
                  <>
                    <div className="text-6xl font-bold text-primary-600 mb-2">
                      {review.finalRating.numeric.toFixed(2)}
                    </div>
                    <div className="text-lg text-gray-600">out of 5.00</div>
                  </>
                ) : review.finalRating?.grade ? (
                  <>
                    <div className="text-6xl font-bold text-primary-600 mb-2">
                      {review.finalRating.grade}
                    </div>
                    <div className="text-lg text-gray-600">
                      {
                        review.finalRating.grade === 'A' ? 'Outstanding' :
                        review.finalRating.grade === 'B' ? 'Exceeds Expectations' :
                        review.finalRating.grade === 'C' ? 'Meets Expectations' :
                        'Below Expectations'
                      }
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500">No rating assigned</div>
                )}
              </div>
            </div>
          </div>

          {/* HR Comments */}
          {review.hrComments && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">HR Comments</h2>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{review.hrComments}</p>
              </div>
            </div>
          )}

          {/* Justification */}
          {review.justification && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Rating Justification</h2>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{review.justification}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Review Info */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Performance Cycle</dt>
                <dd className="text-gray-900">{review.performanceCycle?.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Period</dt>
                <dd className="text-gray-900">
                  {review.performanceCycle?.startDate 
                    ? `${new Date(review.performanceCycle.startDate).toLocaleDateString()} - ${new Date(review.performanceCycle.endDate).toLocaleDateString()}`
                    : '-'}
                </dd>
              </div>
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
              {review.visibleAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Made Visible</dt>
                  <dd className="text-gray-900">
                    {new Date(review.visibleAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyPerformanceReview

