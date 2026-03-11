import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Edit, Copy, ArrowLeft, History, Globe, Eye, EyeOff, Plus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useToast } from '../../contexts/ToastContext'

const JobOpeningDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const [showHistory, setShowHistory] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishPlatforms, setPublishPlatforms] = useState({
    internal: false,
    public: false,
    linkedin: false,
    naukri: false,
    indeed: false
  })

  const { data: job, isLoading } = useQuery({
    queryKey: ['jobOpening', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/jobs/${id}`)
      return response.data.data
    },
  })

  const { data: history } = useQuery({
    queryKey: ['jobHistory', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/jobs/${id}/history`)
      return response.data.data || []
    },
    enabled: showHistory
  })

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/recruitment/jobs/${id}/duplicate`)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['jobOpenings'])
      showToast('Job opening duplicated successfully', 'success')
      navigate(`/recruitment/jobs/${data.data._id}/edit`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to duplicate job opening', 'error')
    }
  })

  const publishMutation = useMutation({
    mutationFn: async (platforms) => {
      const response = await api.post(`/recruitment/jobs/${id}/publish`, { platforms })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobOpening', id])
      showToast('Job opening published successfully', 'success')
      setShowPublishModal(false)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to publish job opening', 'error')
    }
  })

  const unpublishMutation = useMutation({
    mutationFn: async (platforms) => {
      const response = await api.post(`/recruitment/jobs/${id}/unpublish`, { platforms })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobOpening', id])
      showToast('Job opening unpublished successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to unpublish job opening', 'error')
    }
  })

  const handlePublish = () => {
    publishMutation.mutate(publishPlatforms)
  }

  const handleUnpublish = (platforms) => {
    unpublishMutation.mutate(platforms)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Job opening not found</p>
        <Link to="/recruitment/jobs" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Job Openings
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
            <Link to="/recruitment/jobs">
              <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
              <p className="text-primary-100">
                {job.department?.name} • {job.designation?.name}
              </p>
              <p className="text-primary-200 text-sm font-mono mt-1">Job ID: {job._id?.slice(-8) || id}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPublishPlatforms(job.publishedTo || {})
                setShowPublishModal(true)
              }}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Globe className="h-4 w-4 mr-2" />
              Publish Settings
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowHistory(true)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button
              variant="secondary"
              onClick={() => duplicateMutation.mutate()}
              disabled={duplicateMutation.isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
            <Link to={`/recruitment/jobs/${id}/edit`}>
              <Button className="bg-white text-primary-700 hover:bg-primary-50">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* JOB DESCRIPTION Section */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
              Job Description
            </h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
            </div>
          </div>

          {job.requiredSkills && job.requiredSkills.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 uppercase pb-2 border-b-2 border-primary-600">
                Candidates
              </h2>
              <Link to={`/recruitment/jobs/${id}/candidates/new`}>
                <Button variant="secondary" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Candidate
                </Button>
              </Link>
            </div>
            <Link to={`/recruitment/jobs/${id}/candidates`}>
              <Button variant="secondary" className="w-full">
                View All Candidates
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          {/* JOB INFORMATION Section */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
              Job Information
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    job.status === 'open' ? 'bg-green-100 text-green-800' :
                    job.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {job.status?.charAt(0).toUpperCase() + job.status?.slice(1)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Location</dt>
                <dd className="text-gray-900">{job.location}</dd>
                <dd className="text-sm text-gray-500 capitalize">{job.locationType}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Employment Type</dt>
                <dd className="text-gray-900 capitalize">{job.employmentType?.replace('_', ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Vacancies</dt>
                <dd className="text-gray-900">{job.vacancyCount}</dd>
              </div>
              {job.experienceRange && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Experience Range</dt>
                  <dd className="text-gray-900">
                    {job.experienceRange.min} - {job.experienceRange.max || 'Any'} years
                  </dd>
                </div>
              )}
              {job.salaryRange && (job.salaryRange.min || job.salaryRange.max) && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Salary Range</dt>
                  <dd className="text-gray-900">
                    {job.salaryRange.min ? `${job.salaryRange.currency} ${job.salaryRange.min}` : 'Not specified'} - 
                    {job.salaryRange.max ? ` ${job.salaryRange.currency} ${job.salaryRange.max}` : ' Not specified'}
                  </dd>
                </div>
              )}
              {job.hiringManager && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Hiring Manager</dt>
                  <dd className="text-gray-900">
                    {job.hiringManager.firstName} {job.hiringManager.lastName}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Application Start Date</dt>
                <dd className="text-gray-900">
                  {new Date(job.applicationStartDate).toLocaleDateString()}
                </dd>
              </div>
              {job.applicationEndDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Application End Date</dt>
                  <dd className="text-gray-900">
                    {new Date(job.applicationEndDate).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
              Publish Status
            </h2>
            <div className="space-y-2">
              {[
                { key: 'internal', label: 'Internal Portal' },
                { key: 'public', label: 'Public Portal' },
                { key: 'linkedin', label: 'LinkedIn' },
                { key: 'naukri', label: 'Naukri' },
                { key: 'indeed', label: 'Indeed' }
              ].map(platform => (
                <div key={platform.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{platform.label}</span>
                  {job.publishedTo?.[platform.key] ? (
                    <div className="flex items-center space-x-2">
                      <Eye className="h-4 w-4 text-green-600" />
                      <button
                        className="text-sm text-primary-600 hover:text-primary-800 underline"
                        onClick={() => handleUnpublish([platform.key])}
                      >
                        Unpublish
                      </button>
                    </div>
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History Modal */}
      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title="Job History"
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {history && history.length > 0 ? (
            history.map((entry, index) => (
              <div key={index} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">
                      {entry.action?.replace('_', ' ')}
                    </p>
                    {entry.field && (
                      <p className="text-sm text-gray-600">
                        {entry.field}: {String(entry.oldValue)} → {String(entry.newValue)}
                      </p>
                    )}
                    {entry.remarks && (
                      <p className="text-sm text-gray-500 mt-1">{entry.remarks}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{entry.performedBy?.email}</p>
                    <p>{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No history available</p>
          )}
        </div>
      </Modal>

      {/* Publish Modal */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="Publish Job Opening"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Select platforms where you want to publish this job opening:
          </p>
          {[
            { key: 'internal', label: 'Internal Career Portal' },
            { key: 'public', label: 'Public Job Portal' },
            { key: 'linkedin', label: 'LinkedIn' },
            { key: 'naukri', label: 'Naukri' },
            { key: 'indeed', label: 'Indeed' }
          ].map(platform => (
            <label key={platform.key} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={publishPlatforms[platform.key] || false}
                onChange={(e) => setPublishPlatforms(prev => ({
                  ...prev,
                  [platform.key]: e.target.checked
                }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">{platform.label}</span>
            </label>
          ))}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => setShowPublishModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              isLoading={publishMutation.isLoading}
            >
              Update Publishing
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default JobOpeningDetail

