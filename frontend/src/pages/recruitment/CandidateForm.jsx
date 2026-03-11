import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useEffect } from 'react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { FileText, X } from 'lucide-react'

const CandidateForm = () => {
  const { id, jobOpeningId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    experience: {
      years: 0,
      months: 0
    },
    source: 'other',
    coverLetter: '',
    notes: '',
    assignedRecruiter: '',
    jobOpening: jobOpeningId || ''
  })

  const [resumeFile, setResumeFile] = useState(null)
  const [resumePreview, setResumePreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [duplicateWarning, setDuplicateWarning] = useState(null)

  const { data: candidate, isLoading: candidateLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/candidates/${id}`)
      return response.data.data
    },
    enabled: isEdit,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          experience: {
            years: data.experience?.years || 0,
            months: data.experience?.months || 0
          },
          source: data.source || 'other',
          coverLetter: data.coverLetter || '',
          notes: data.notes || '',
          assignedRecruiter: data.assignedRecruiter?._id || data.assignedRecruiter || '',
          jobOpening: data.jobOpening?._id || data.jobOpening || ''
        })
        if (data.resume) {
          setResumePreview(data.resumeFileName || 'Resume uploaded')
        }
      }
    }
  })

  const { data: jobOpenings } = useQuery({
    queryKey: ['jobOpenings'],
    queryFn: async () => {
      const response = await api.get('/recruitment/jobs')
      return response.data.data || []
    },
  })

  const { data: users } = useQuery({
    queryKey: ['users', 'hr'],
    queryFn: async () => {
      try {
        const response = await api.get('/users', { params: { role: 'hr' } })
        return response.data.data || []
      } catch (error) {
        // Fallback to empty array if endpoint doesn't exist
        return []
      }
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData()
      
      // Add all fields
      formDataToSend.append('firstName', data.firstName)
      formDataToSend.append('lastName', data.lastName)
      formDataToSend.append('email', data.email)
      formDataToSend.append('phone', data.phone)
      formDataToSend.append('experience[years]', data.experience.years || 0)
      formDataToSend.append('experience[months]', data.experience.months || 0)
      formDataToSend.append('source', data.source)
      if (data.coverLetter) formDataToSend.append('coverLetter', data.coverLetter)
      if (data.notes) formDataToSend.append('notes', data.notes)
      if (data.assignedRecruiter) formDataToSend.append('assignedRecruiter', data.assignedRecruiter)
      formDataToSend.append('jobOpening', data.jobOpening)

      if (resumeFile) {
        formDataToSend.append('resume', resumeFile)
      }

      const response = await api.post(
        `/recruitment/jobs/${data.jobOpening}/candidates`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['candidates'])
      queryClient.invalidateQueries(['jobOpenings'])
      showToast('Candidate application created successfully', 'success')
      navigate(`/recruitment/candidates/${data.data._id}`)
    },
    onError: (error) => {
      if (error.response?.data?.duplicate) {
        setDuplicateWarning(error.response.data.errors)
        showToast('Duplicate candidate detected', 'error')
      } else {
        showToast(error.response?.data?.message || 'Failed to create candidate application', 'error')
      }
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const formDataToSend = new FormData()
      
      // Add all fields
      formDataToSend.append('firstName', data.firstName)
      formDataToSend.append('lastName', data.lastName)
      formDataToSend.append('email', data.email)
      formDataToSend.append('phone', data.phone)
      formDataToSend.append('experience[years]', data.experience.years || 0)
      formDataToSend.append('experience[months]', data.experience.months || 0)
      formDataToSend.append('source', data.source)
      if (data.coverLetter) formDataToSend.append('coverLetter', data.coverLetter)
      if (data.notes) formDataToSend.append('notes', data.notes)
      if (data.assignedRecruiter) formDataToSend.append('assignedRecruiter', data.assignedRecruiter)

      if (resumeFile) {
        formDataToSend.append('resume', resumeFile)
      }

      const response = await api.put(
        `/recruitment/candidates/${id}`,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['candidates'])
      queryClient.invalidateQueries(['candidate', id])
      showToast('Candidate application updated successfully', 'success')
      navigate(`/recruitment/candidates/${id}`)
    },
    onError: (error) => {
      if (error.response?.data?.duplicate) {
        setDuplicateWarning(error.response.data.errors)
        showToast('Duplicate candidate detected', 'error')
      } else {
        showToast(error.response?.data?.message || 'Failed to update candidate application', 'error')
      }
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value === '' ? 0 : (isNaN(value) ? value : Number(value))
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
    setDuplicateWarning(null)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      const allowedExtensions = ['pdf', 'doc', 'docx']
      const fileExtension = file.name.split('.').pop().toLowerCase()
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        showToast('Only PDF, DOC, and DOCX files are allowed', 'error')
        return
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error')
        return
      }

      setResumeFile(file)
      setResumePreview(file.name)
    }
  }

  const handleRemoveResume = () => {
    setResumeFile(null)
    setResumePreview(null)
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = 'Invalid email format'
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
    if (!formData.jobOpening) newErrors.jobOpening = 'Job opening is required'
    if (!isEdit && !resumeFile && !resumePreview) newErrors.resume = 'Resume is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) {
      showToast('Please fix the errors in the form', 'error')
      return
    }

    if (isEdit) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  if (isEdit && candidateLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? 'Edit Candidate Application' : 'Add Candidate Application'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEdit ? 'Update candidate application details' : 'Record a new candidate application'}
        </p>
      </div>

      {duplicateWarning && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Duplicate Candidate Detected</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700">
            {Array.isArray(duplicateWarning) ? duplicateWarning.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            )) : <li>{duplicateWarning}</li>}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              error={errors.firstName}
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              error={errors.lastName}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              error={errors.email}
            />
            <Input
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              error={errors.phone}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Experience (Years)"
              name="experience.years"
              type="number"
              min="0"
              value={formData.experience.years || ''}
              onChange={handleChange}
            />
            <Input
              label="Experience (Months)"
              name="experience.months"
              type="number"
              min="0"
              max="11"
              value={formData.experience.months || ''}
              onChange={handleChange}
            />
            <Select
              label="Source"
              name="source"
              value={formData.source}
              onChange={handleChange}
              required
              options={[
                { value: 'referral', label: 'Referral' },
                { value: 'job_portal', label: 'Job Portal' },
                { value: 'website', label: 'Website' },
                { value: 'walk_in', label: 'Walk-in' },
                { value: 'agency', label: 'Agency' },
                { value: 'linkedin', label: 'LinkedIn' },
                { value: 'naukri', label: 'Naukri' },
                { value: 'indeed', label: 'Indeed' },
                { value: 'other', label: 'Other' }
              ]}
            />
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Job & Assignment</h2>
          
          <Select
            label="Job Opening"
            name="jobOpening"
            value={formData.jobOpening}
            onChange={handleChange}
            required
            error={errors.jobOpening}
            disabled={!!jobOpeningId}
            options={[
              { value: '', label: 'Select Job Opening' },
              ...(jobOpenings?.filter(job => job.status === 'open').map(job => ({ 
                value: job._id, 
                label: `${job.title} - ${job.department?.name || ''}` 
              })) || [])
            ]}
          />

          <Select
            label="Assigned Recruiter (Optional)"
            name="assignedRecruiter"
            value={formData.assignedRecruiter}
            onChange={handleChange}
            placeholder="Select Recruiter"
            options={[
              { value: '', label: 'Select Recruiter (Optional)' },
              ...(users?.map(user => ({ 
                value: user._id, 
                label: user.email 
              })) || [])
            ]}
          />
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resume (PDF, DOC, DOCX) <span className="text-red-500">*</span>
            </label>
            {resumePreview ? (
              <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <span className="text-sm text-gray-700">{resumePreview}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveResume}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                required={!isEdit}
              />
            )}
            {errors.resume && (
              <p className="mt-1 text-sm text-red-600">{errors.resume}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Maximum file size: 5MB</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Letter (Optional)
            </label>
            <textarea
              name="coverLetter"
              value={formData.coverLetter}
              onChange={handleChange}
              rows={4}
              className="input"
              placeholder="Cover letter text..."
            />
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Candidate Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="input"
              placeholder="Internal notes about the candidate..."
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createMutation.isLoading || updateMutation.isLoading}
          >
            {isEdit ? 'Update Application' : 'Create Application'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CandidateForm

