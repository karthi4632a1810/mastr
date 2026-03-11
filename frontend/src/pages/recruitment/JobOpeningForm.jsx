import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useEffect } from 'react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { X, Plus } from 'lucide-react'

const JobOpeningForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    designation: '',
    description: '',
    location: '',
    locationType: 'onsite',
    vacancyCount: 1,
    employmentType: 'full_time',
    experienceRange: {
      min: 0,
      max: null
    },
    salaryRange: {
      min: null,
      max: null,
      currency: 'USD'
    },
    requiredSkills: [],
    hiringManager: '',
    applicationStartDate: new Date().toISOString().split('T')[0],
    applicationEndDate: '',
    status: 'draft'
  })

  const [skillInput, setSkillInput] = useState('')
  const [errors, setErrors] = useState({})

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['jobOpening', id],
    queryFn: async () => {
      const response = await api.get(`/recruitment/jobs/${id}`)
      return response.data.data
    },
    enabled: isEdit,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          title: data.title || '',
          department: data.department?._id || data.department || '',
          designation: data.designation?._id || data.designation || '',
          description: data.description || '',
          location: data.location || '',
          locationType: data.locationType || 'onsite',
          vacancyCount: data.vacancyCount || 1,
          employmentType: data.employmentType || 'full_time',
          experienceRange: {
            min: data.experienceRange?.min || 0,
            max: data.experienceRange?.max || null
          },
          salaryRange: {
            min: data.salaryRange?.min || null,
            max: data.salaryRange?.max || null,
            currency: data.salaryRange?.currency || 'USD'
          },
          requiredSkills: data.requiredSkills || [],
          hiringManager: data.hiringManager?._id || data.hiringManager || '',
          applicationStartDate: data.applicationStartDate 
            ? new Date(data.applicationStartDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          applicationEndDate: data.applicationEndDate 
            ? new Date(data.applicationEndDate).toISOString().split('T')[0]
            : '',
          status: data.status || 'draft'
        })
      }
    }
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data.data || []
    },
  })

  const { data: designations } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const response = await api.get('/designations')
      return response.data.data || []
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => {
      const response = await api.get('/employees', { params: { limit: 1000 } })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/recruitment/jobs', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['jobOpenings'])
      showToast('Job opening created successfully', 'success')
      navigate(`/recruitment/jobs/${data.data._id}`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create job opening', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/recruitment/jobs/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobOpenings'])
      queryClient.invalidateQueries(['jobOpening', id])
      showToast('Job opening updated successfully', 'success')
      navigate(`/recruitment/jobs/${id}`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update job opening', 'error')
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
          [child]: value === '' ? null : (isNaN(value) ? value : Number(value))
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: isNaN(value) || name === 'vacancyCount' ? value : Number(value)
      }))
    }
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.requiredSkills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, skillInput.trim()]
      }))
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter(s => s !== skill)
    }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Job title is required'
    if (!formData.department) newErrors.department = 'Department is required'
    if (!formData.designation) newErrors.designation = 'Designation is required'
    if (!formData.description.trim()) newErrors.description = 'Job description is required'
    if (!formData.location.trim()) newErrors.location = 'Location is required'
    if (!formData.vacancyCount || formData.vacancyCount < 1) newErrors.vacancyCount = 'Vacancy count must be at least 1'
    if (formData.experienceRange.max && formData.experienceRange.min > formData.experienceRange.max) {
      newErrors['experienceRange.max'] = 'Maximum experience must be greater than minimum'
    }
    if (formData.salaryRange.max && formData.salaryRange.min && formData.salaryRange.min > formData.salaryRange.max) {
      newErrors['salaryRange.max'] = 'Maximum salary must be greater than minimum'
    }
    if (formData.applicationEndDate && formData.applicationStartDate && new Date(formData.applicationEndDate) < new Date(formData.applicationStartDate)) {
      newErrors.applicationEndDate = 'End date must be after start date'
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

    const submitData = {
      ...formData,
      experienceRange: {
        min: formData.experienceRange.min || 0,
        max: formData.experienceRange.max || null
      },
      salaryRange: {
        min: formData.salaryRange.min || null,
        max: formData.salaryRange.max || null,
        currency: formData.salaryRange.currency
      },
      hiringManager: formData.hiringManager || null,
      applicationEndDate: formData.applicationEndDate || null
    }

    if (isEdit) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  if (isEdit && jobLoading) {
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
          {isEdit ? 'Edit Job Opening' : 'Create Job Opening'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEdit ? 'Update job opening details' : 'Add a new job opening to your recruitment pipeline'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              error={errors.title}
            />
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              error={errors.department}
              options={[
                { value: '', label: 'Select Department' },
                ...(departments?.map(dept => ({ value: dept._id, label: dept.name })) || [])
              ]}
            />
            <Select
              label="Designation"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
              required
              error={errors.designation}
              options={[
                { value: '', label: 'Select Designation' },
                ...(designations?.map(des => ({ value: des._id, label: des.name })) || [])
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={6}
              className={`input ${errors.description ? 'border-red-500 focus:ring-red-500' : ''}`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Location & Employment Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              error={errors.location}
              placeholder="e.g., New York, Remote, etc."
            />
            <Select
              label="Location Type"
              name="locationType"
              value={formData.locationType}
              onChange={handleChange}
              required
              options={[
                { value: 'onsite', label: 'Onsite' },
                { value: 'remote', label: 'Remote' },
                { value: 'hybrid', label: 'Hybrid' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Vacancy Count"
              name="vacancyCount"
              type="number"
              min="1"
              value={formData.vacancyCount}
              onChange={handleChange}
              required
              error={errors.vacancyCount}
            />
            <Select
              label="Employment Type"
              name="employmentType"
              value={formData.employmentType}
              onChange={handleChange}
              required
              options={[
                { value: 'full_time', label: 'Full-time' },
                { value: 'part_time', label: 'Part-time' },
                { value: 'contract', label: 'Contract' },
                { value: 'internship', label: 'Internship' }
              ]}
            />
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Experience & Salary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Minimum Experience (Years)"
              name="experienceRange.min"
              type="number"
              min="0"
              value={formData.experienceRange.min || ''}
              onChange={handleChange}
            />
            <Input
              label="Maximum Experience (Years)"
              name="experienceRange.max"
              type="number"
              min="0"
              value={formData.experienceRange.max || ''}
              onChange={handleChange}
              error={errors['experienceRange.max']}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Minimum Salary"
              name="salaryRange.min"
              type="number"
              min="0"
              value={formData.salaryRange.min || ''}
              onChange={handleChange}
              placeholder="Optional"
            />
            <Input
              label="Maximum Salary"
              name="salaryRange.max"
              type="number"
              min="0"
              value={formData.salaryRange.max || ''}
              onChange={handleChange}
              error={errors['salaryRange.max']}
              placeholder="Optional"
            />
            <Select
              label="Currency"
              name="salaryRange.currency"
              value={formData.salaryRange.currency}
              onChange={handleChange}
              options={[
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
                { value: 'GBP', label: 'GBP' },
                { value: 'INR', label: 'INR' }
              ]}
            />
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Skills & Hiring Manager</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Skills
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add a skill and press Enter"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSkill()
                  }
                }}
                className="flex-1"
              />
              <Button type="button" onClick={handleAddSkill} variant="secondary">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Select
            label="Hiring Manager"
            name="hiringManager"
            value={formData.hiringManager}
            onChange={handleChange}
            placeholder="Select Hiring Manager (Optional)"
            options={[
              { value: '', label: 'Select Hiring Manager (Optional)' },
              ...(employees?.map(emp => ({ 
                value: emp._id, 
                label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})` 
              })) || [])
            ]}
          />
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Application Timeline</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Application Start Date"
              name="applicationStartDate"
              type="date"
              value={formData.applicationStartDate}
              onChange={handleChange}
              required
            />
            <Input
              label="Application End Date"
              name="applicationEndDate"
              type="date"
              value={formData.applicationEndDate}
              onChange={handleChange}
              error={errors.applicationEndDate}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/recruitment/jobs')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createMutation.isLoading || updateMutation.isLoading}
          >
            {isEdit ? 'Update Job Opening' : 'Create Job Opening'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default JobOpeningForm

