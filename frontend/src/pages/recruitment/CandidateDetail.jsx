import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Edit, ArrowLeft, FileText, Download, Mail, Phone, Briefcase, Calendar, User, FileCheck, History, ArrowRight, Plus, X, Video, Phone as PhoneIcon, MapPin, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import Button from '../../components/Button'
import StageChangeModal from './StageChangeModal'
import InterviewScheduleModal from './InterviewScheduleModal'
import InterviewFeedbackModal from './InterviewFeedbackModal'
import { useState } from 'react'
import Modal from '../../components/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'

const CandidateDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showStageModal, setShowStageModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState(null)

  const { data: candidate, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${id}`)
      return response.data.data
    },
  })

  const { data: stageHistory } = useQuery({
    queryKey: ['candidateStageHistory', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${id}/stage-history`)
      return response.data.data || []
    },
    enabled: showHistoryModal
  })

  const getStageLabel = (stage) => {
    const stages = {
      applied: 'Applied',
      screening: 'Screening',
      shortlisted: 'Shortlisted',
      interview: 'Interview',
      hr_interview: 'HR Interview',
      manager_round: 'Manager Round',
      offer: 'Offer',
      hired: 'Hired',
      rejected: 'Rejected'
    }
    return stages[stage] || stage
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Candidate not found</p>
        <Link to="/recruitment/candidates" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Candidates
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Professional Header Banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-6 py-8 mb-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/recruitment/candidates">
              <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <p className="text-primary-100">
                {candidate.jobOpening?.title}
              </p>
              <p className="text-primary-200 text-sm font-mono mt-1">Candidate ID: {candidate._id?.slice(-8) || id}</p>
            </div>
          </div>
          <Link to={`/recruitment/candidates/${id}/edit`}>
            <Button className="bg-white text-primary-700 hover:bg-primary-50">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Contact Information</h2>
            <dl className="space-y-3">
              <div className="flex items-start">
                <Mail className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="text-gray-900">{candidate.email}</dd>
                </div>
              </div>
              <div className="flex items-start">
                <Phone className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="text-gray-900">{candidate.phone}</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Application Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Job Opening</dt>
                <dd className="text-gray-900">{candidate.jobOpening?.title}</dd>
                <dd className="text-sm text-gray-500">
                  {candidate.jobOpening?.department?.name} • {candidate.jobOpening?.designation?.name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Experience</dt>
                <dd className="text-gray-900">
                  {candidate.experience ? (
                    (() => {
                      const exp = candidate.experience
                      const parts = []
                      if (exp.years > 0) parts.push(`${exp.years} year${exp.years > 1 ? 's' : ''}`)
                      if (exp.months > 0) parts.push(`${exp.months} month${exp.months > 1 ? 's' : ''}`)
                      return parts.length > 0 ? parts.join(', ') : '0 years'
                    })()
                  ) : '-'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Source</dt>
                <dd className="text-gray-900 capitalize">{candidate.source?.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Applied Date</dt>
                <dd className="text-gray-900">
                  {new Date(candidate.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {candidate.coverLetter && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Cover Letter</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{candidate.coverLetter}</p>
              </div>
            </div>
          )}

          {candidate.notes && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Notes</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{candidate.notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 uppercase pb-2 border-b-2 border-primary-600">Status</h2>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowHistoryModal(true)}
                >
                  <History className="h-4 w-4 mr-1" />
                  History
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowStageModal(true)}
                >
                  Change Stage
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Stage</dt>
                <dd>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    candidate.stage === 'hired' ? 'bg-green-100 text-green-800' :
                    candidate.stage === 'rejected' ? 'bg-red-100 text-red-800' :
                    candidate.stage === 'offer' ? 'bg-blue-100 text-blue-800' :
                    candidate.stage === 'hr_interview' || candidate.stage === 'manager_round' ? 'bg-purple-100 text-purple-800' :
                    candidate.stage === 'interview' ? 'bg-indigo-100 text-indigo-800' :
                    candidate.stage === 'shortlisted' ? 'bg-cyan-100 text-cyan-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getStageLabel(candidate.stage)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Status</dt>
                <dd>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    candidate.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {candidate.status?.charAt(0).toUpperCase() + candidate.status?.slice(1)}
                  </span>
                </dd>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Documents</h2>
            {candidate.resume ? (
              <div className="space-y-2">
                <a
                  href={candidate.resume}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {candidate.resumeFileName || 'Resume'}
                    </p>
                    <p className="text-xs text-gray-500">Click to view</p>
                  </div>
                  <Download className="h-4 w-4 text-gray-400" />
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No resume uploaded</p>
            )}
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Assignment</h2>
            <dl className="space-y-3">
              {candidate.assignedRecruiter && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned Recruiter</dt>
                  <dd className="text-gray-900">{candidate.assignedRecruiter.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Added By</dt>
                <dd className="text-gray-900">{candidate.addedBy?.email || '-'}</dd>
              </div>
            </dl>
          </div>

          {candidate.extractedSkills && candidate.extractedSkills.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {candidate.extractedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interviews Section */}
      <div className="mt-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 uppercase pb-2 border-b-2 border-primary-600">Interviews</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowScheduleModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
          </div>

          {candidate.interviews && candidate.interviews.length > 0 ? (
            <div className="space-y-4">
              {candidate.interviews.map((interview, index) => (
                <InterviewCard
                  key={interview._id || index}
                  interview={interview}
                  candidate={candidate}
                  user={user}
                  onFeedback={() => {
                    setSelectedInterview(interview)
                    setShowFeedbackModal(true)
                  }}
                  onCancel={async () => {
                    if (window.confirm('Are you sure you want to cancel this interview?')) {
                      try {
                        const response = await api.post(
                          `/recruitment/candidates/${candidate._id}/interviews/${interview._id}/cancel`,
                          { notifyCandidate: true }
                        )
                        queryClient.invalidateQueries(['candidate', candidate._id])
                        showToast('Interview cancelled successfully', 'success')
                      } catch (error) {
                        showToast(error.response?.data?.message || 'Failed to cancel interview', 'error')
                      }
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No interviews scheduled</p>
            </div>
          )}
        </div>
      </div>

      {/* Stage Change Modal */}
      <StageChangeModal
        isOpen={showStageModal}
        onClose={() => setShowStageModal(false)}
        candidate={candidate}
        currentStage={candidate?.stage}
      />

      {/* Stage History Modal */}
      <Modal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Stage History"
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {stageHistory && stageHistory.length > 0 ? (
            stageHistory.map((entry, index) => (
              <div key={index} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      {entry.fromStage && (
                        <>
                          <span className="text-sm font-medium text-gray-600">
                            {getStageLabel(entry.fromStage)}
                          </span>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </>
                      )}
                      <span className={`text-sm font-medium px-2 py-1 rounded ${
                        entry.toStage === 'hired' ? 'bg-green-100 text-green-800' :
                        entry.toStage === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {getStageLabel(entry.toStage)}
                      </span>
                      {entry.isOverride && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                          Admin Override
                        </span>
                      )}
                    </div>
                    {entry.comments && (
                      <p className="text-sm text-gray-600 mt-1">{entry.comments}</p>
                    )}
                    {entry.overrideReason && (
                      <p className="text-xs text-yellow-700 mt-1">
                        <strong>Override Reason:</strong> {entry.overrideReason}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {entry.notifiedCandidate && (
                        <span>📧 Candidate notified</span>
                      )}
                      {entry.notifiedInterviewer && (
                        <span>📧 Interviewer notified</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{entry.changedBy?.email}</p>
                    <p>{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No stage history available</p>
          )}
        </div>
      </Modal>

      {/* Interview Schedule Modal */}
      <InterviewScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        candidate={candidate}
      />

      {/* Interview Feedback Modal */}
      {selectedInterview && (
        <InterviewFeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => {
            setShowFeedbackModal(false)
            setSelectedInterview(null)
          }}
          candidate={candidate}
          interview={selectedInterview}
        />
      )}
    </div>
  )
}

// Interview Card Component
const InterviewCard = ({ interview, candidate, user, onFeedback, onCancel }) => {
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

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'video': return <Video className="h-4 w-4" />
      case 'phone': return <PhoneIcon className="h-4 w-4" />
      default: return <MapPin className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      rescheduled: 'bg-yellow-100 text-yellow-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (date, time) => {
    const dateStr = formatDate(date)
    return time ? `${dateStr} at ${time}` : dateStr
  }

  const isInterviewer = interview.interviewers?.some(
    interviewer => interviewer._id === user?._id || interviewer.toString() === user?._id
  )

  const canSubmitFeedback = (isInterviewer || user?.role === 'admin' || user?.role === 'hr') &&
    (interview.status === 'scheduled' || interview.status === 'rescheduled' || interview.status === 'completed')

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-gray-900">{getRoundLabel(interview.round)} Interview</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(interview.status)}`}>
              {interview.status?.charAt(0).toUpperCase() + interview.status?.slice(1)}
            </span>
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>{formatDateTime(interview.scheduledDate, interview.scheduledTime)}</span>
            </div>
            <div className="flex items-center space-x-2">
              {getModeIcon(interview.mode)}
              <span className="capitalize">{interview.mode?.replace('_', ' ')}</span>
              {interview.mode === 'video' && interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 underline text-xs"
                >
                  Join Meeting
                </a>
              )}
              {interview.mode === 'in_person' && interview.location && (
                <span>• {interview.location}</span>
              )}
            </div>
            {interview.interviewers && interview.interviewers.length > 0 && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>
                  {interview.interviewers.map(int => int.email || int).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          {canSubmitFeedback && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onFeedback}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              {interview.feedback?.submittedAt ? 'View/Update Feedback' : 'Submit Feedback'}
            </Button>
          )}
          {(interview.status === 'scheduled' || interview.status === 'rescheduled') && 
           (user?.role === 'admin' || user?.role === 'hr') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {interview.feedback?.submittedAt && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-gray-900">Feedback Submitted</span>
              </div>
              {interview.feedback.rating && (
                <p className="text-xs text-gray-600 mt-1">
                  Rating: {interview.feedback.rating}/5
                  {interview.feedback.recommendation && (
                    <span className="ml-2 capitalize">
                      • {interview.feedback.recommendation === 'proceed' ? '✅ Proceed' :
                          interview.feedback.recommendation === 'hold' ? '⏸️ Hold' :
                          '❌ Reject'}
                    </span>
                  )}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {new Date(interview.feedback.submittedAt).toLocaleDateString()}
            </span>
          </div>
          {interview.feedback.writtenComments && (
            <p className="text-sm text-gray-700 mt-2 line-clamp-2">
              {interview.feedback.writtenComments}
            </p>
          )}
        </div>
      )}

      {interview.status === 'cancelled' && interview.cancellationReason && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-red-600">
            <strong>Cancelled:</strong> {interview.cancellationReason}
          </p>
          {interview.cancelledAt && (
            <p className="text-xs text-gray-500 mt-1">
              {formatDate(interview.cancelledAt)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default CandidateDetail

