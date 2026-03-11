import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Edit, ArrowLeft, Copy, History, CheckCircle, XCircle, FileText, User, Calendar } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'

const OnboardingTemplateDetail = () => {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [showVersionsModal, setShowVersionsModal] = useState(false)

  const { data: template, isLoading } = useQuery({
    queryKey: ['onboardingTemplate', id],
    queryFn: async () => {
      const response = await api.get(`/onboarding/templates/${id}`)
      return response.data.data
    },
  })

  const { data: versions } = useQuery({
    queryKey: ['templateVersions', id],
    queryFn: async () => {
      const response = await api.get(`/onboarding/templates/${id}/versions`)
      return response.data.data || []
    },
    enabled: showVersionsModal
  })

  const cloneMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/onboarding/templates/${id}/clone`)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['onboardingTemplates'])
      showToast('Template cloned successfully', 'success')
      window.location.href = `/onboarding/templates/${data.data._id}/edit`
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to clone template', 'error')
    }
  })

  const getCategoryLabel = (category) => {
    const categories = {
      general: 'General',
      it: 'IT',
      departmental: 'Departmental',
      leadership: 'Leadership',
      intern: 'Intern'
    }
    return categories[category] || category
  }

  const getRoleLabel = (role) => {
    const roles = {
      employee: 'Employee',
      hr: 'HR',
      manager: 'Manager',
      it: 'IT',
      admin: 'Admin'
    }
    return roles[role] || role
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Template not found</p>
        <Link to="/onboarding/templates" className="text-primary-600 hover:text-primary-800 mt-4 inline-block">
          Back to Templates
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
            <Link to="/onboarding/templates">
              <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
              {template.version > 1 && (
                <p className="text-primary-100">Version {template.version}</p>
              )}
              <p className="text-primary-200 text-sm font-mono mt-1">Template ID: {template._id?.slice(-8) || id}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {template.parentTemplate && (
              <Button
                variant="secondary"
                onClick={() => setShowVersionsModal(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <History className="h-4 w-4 mr-2" />
                Versions
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => cloneMutation.mutate()}
              disabled={cloneMutation.isLoading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </Button>
            <Link to={`/onboarding/templates/${id}/edit`}>
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
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {template.description || 'No description provided'}
            </p>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Tasks ({template.tasks?.length || 0})</h2>
            {template.tasks && template.tasks.length > 0 ? (
              <div className="space-y-4">
                {template.tasks
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((task, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {index + 1}. {task.taskName}
                            {task.isMandatory && (
                              <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded">
                                Mandatory
                              </span>
                            )}
                          </h3>
                          {task.taskDescription && (
                            <p className="text-sm text-gray-600 mt-1">{task.taskDescription}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">Responsible:</span>
                          <span className="ml-1 font-medium">{getRoleLabel(task.responsibleRole)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Due:</span>
                          <span className="ml-1 font-medium">
                            {task.dueDays === 0 ? 'Day 0' : task.dueDays > 0 ? `Day +${task.dueDays}` : `Day ${task.dueDays}`}
                          </span>
                        </div>
                        {task.requiresAttachment && (
                          <div className="flex items-center text-blue-600">
                            <FileText className="h-4 w-4 mr-1" />
                            <span>Attachment</span>
                          </div>
                        )}
                        {task.requiresApproval && (
                          <div className="flex items-center text-orange-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span>Approval</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">No tasks defined</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="text-gray-900">{getCategoryLabel(template.category)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.isActive ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              {template.version > 1 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Version</dt>
                  <dd className="text-gray-900">v{template.version}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created By</dt>
                <dd className="text-gray-900">{template.createdBy?.email || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="text-gray-900">
                  {new Date(template.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">Linked To</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Departments</dt>
                <dd className="text-gray-900">
                  {template.linkedDepartments && template.linkedDepartments.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.linkedDepartments.map((dept, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {dept.name || dept}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">All departments</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Designations</dt>
                <dd className="text-gray-900">
                  {template.linkedDesignations && template.linkedDesignations.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.linkedDesignations.map((des, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {des.name || des}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">All roles</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Employee Types</dt>
                <dd className="text-gray-900">
                  {template.linkedEmployeeTypes && template.linkedEmployeeTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.linkedEmployeeTypes.map((type, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs capitalize">
                          {type.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">All types</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Locations</dt>
                <dd className="text-gray-900">
                  {template.linkedLocations && template.linkedLocations.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {template.linkedLocations.map((loc, idx) => (
                        <span key={idx} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          {loc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">All locations</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Versions Modal */}
      <Modal
        isOpen={showVersionsModal}
        onClose={() => setShowVersionsModal(false)}
        title="Template Versions"
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {versions && versions.length > 0 ? (
            versions.map((version) => (
              <div key={version._id} className="border-b pb-3 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{version.name}</span>
                      <span className="text-sm text-gray-500">v{version.version}</span>
                      {version.isLatestVersion && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded">
                          Latest
                        </span>
                      )}
                      {version.isActive ? (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-800 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {version.tasks?.length || 0} tasks
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {new Date(version.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link to={`/onboarding/templates/${version._id}`}>
                    <Button variant="secondary" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No version history available</p>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default OnboardingTemplateDetail

