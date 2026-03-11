import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useEffect } from 'react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { Plus, X, GripVertical, ArrowUp, ArrowDown } from 'lucide-react'

const OnboardingTemplateForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    linkedDepartments: [],
    linkedDesignations: [],
    linkedEmployeeTypes: [],
    linkedLocations: [],
    tasks: []
  })

  const [errors, setErrors] = useState({})

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['onboardingTemplate', id],
    queryFn: async () => {
      const response = await api.get(`/onboarding/templates/${id}`)
      return response.data.data
    },
    enabled: isEdit,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          name: data.name || '',
          description: data.description || '',
          category: data.category || 'general',
          linkedDepartments: data.linkedDepartments?.map(d => d._id || d) || [],
          linkedDesignations: data.linkedDesignations?.map(d => d._id || d) || [],
          linkedEmployeeTypes: data.linkedEmployeeTypes || [],
          linkedLocations: data.linkedLocations || [],
          tasks: data.tasks || []
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

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/onboarding/templates', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['onboardingTemplates'])
      showToast('Template created successfully', 'success')
      navigate(`/onboarding/templates/${data.data._id}`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create template', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/onboarding/templates/${id}`, data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['onboardingTemplates'])
      queryClient.invalidateQueries(['onboardingTemplate', id])
      if (data.isNewVersion) {
        showToast(`New version (v${data.data.version}) created. Previous version preserved.`, 'success')
        navigate(`/onboarding/templates/${data.data._id}`)
      } else {
        showToast('Template updated successfully', 'success')
        navigate(`/onboarding/templates/${id}`)
      }
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update template', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

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

  const handleMultiSelect = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: Array.from(value.selectedOptions, option => option.value)
    }))
  }

  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, {
        taskName: '',
        taskDescription: '',
        responsibleRole: 'employee',
        dueDays: 0,
        isMandatory: true,
        requiresAttachment: false,
        requiresApproval: false,
        order: prev.tasks.length
      }]
    }))
  }

  const removeTask = (index) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index).map((task, i) => ({ ...task, order: i }))
    }))
  }

  const updateTask = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }))
  }

  const moveTask = (index, direction) => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === formData.tasks.length - 1)) {
      return
    }
    const newIndex = direction === 'up' ? index - 1 : index + 1
    const newTasks = [...formData.tasks]
    const temp = newTasks[index]
    newTasks[index] = newTasks[newIndex]
    newTasks[newIndex] = temp
    newTasks.forEach((task, i) => { task.order = i })
    setFormData(prev => ({ ...prev, tasks: newTasks }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Template name is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (formData.tasks.length === 0) {
      newErrors.tasks = 'At least one task is required'
    } else {
      formData.tasks.forEach((task, index) => {
        if (!task.taskName.trim()) {
          newErrors[`task_${index}_name`] = 'Task name is required'
        }
        if (task.dueDays === null || task.dueDays === undefined) {
          newErrors[`task_${index}_dueDays`] = 'Due days is required'
        }
      })
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
      tasks: formData.tasks.map((task, index) => ({
        ...task,
        order: index
      }))
    }

    if (isEdit) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  if (isEdit && templateLoading) {
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
          {isEdit ? 'Edit Onboarding Template' : 'Create Onboarding Template'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEdit ? 'Update template details and tasks' : 'Define a reusable onboarding template with structured tasks'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          
          <Input
            label="Template Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            error={errors.name}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="input"
              placeholder="Describe the purpose and scope of this template..."
            />
          </div>

          <Select
            label="Category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            error={errors.category}
            options={[
              { value: 'general', label: 'General' },
              { value: 'it', label: 'IT' },
              { value: 'departmental', label: 'Departmental' },
              { value: 'leadership', label: 'Leadership' },
              { value: 'intern', label: 'Intern' }
            ]}
          />
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Linking Logic</h2>
          <p className="text-sm text-gray-600">
            Leave empty to apply to all. Select specific values to restrict template usage.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departments (Optional - leave empty for all)
            </label>
            <select
              multiple
              value={formData.linkedDepartments}
              onChange={(e) => handleMultiSelect('linkedDepartments', e.target)}
              className="input"
              size="4"
            >
              {departments?.map(dept => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple. Leave empty for all departments.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designations/Roles (Optional - leave empty for all)
            </label>
            <select
              multiple
              value={formData.linkedDesignations}
              onChange={(e) => handleMultiSelect('linkedDesignations', e.target)}
              className="input"
              size="4"
            >
              {designations?.map(des => (
                <option key={des._id} value={des._id}>
                  {des.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple. Leave empty for all roles.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee Types (Optional - leave empty for all)
            </label>
            <select
              multiple
              value={formData.linkedEmployeeTypes}
              onChange={(e) => handleMultiSelect('linkedEmployeeTypes', e.target)}
              className="input"
              size="4"
            >
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple. Leave empty for all types.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Locations (Optional - leave empty for all)
            </label>
            <Input
              name="linkedLocations"
              value={formData.linkedLocations.join(', ')}
              onChange={(e) => {
                const locations = e.target.value.split(',').map(l => l.trim()).filter(l => l)
                setFormData(prev => ({ ...prev, linkedLocations: locations }))
              }}
              placeholder="Enter locations separated by commas (e.g., New York, Remote, Bangalore)"
            />
          </div>
        </div>

        <div className="card space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Tasks</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={addTask}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          {errors.tasks && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.tasks}</p>
            </div>
          )}

          {formData.tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tasks added yet. Click "Add Task" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.tasks.map((task, index) => (
                <TaskCard
                  key={index}
                  task={task}
                  index={index}
                  errors={errors}
                  onUpdate={(field, value) => updateTask(index, field, value)}
                  onRemove={() => removeTask(index)}
                  onMove={(direction) => moveTask(index, direction)}
                  canMoveUp={index > 0}
                  canMoveDown={index < formData.tasks.length - 1}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/onboarding/templates')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createMutation.isLoading || updateMutation.isLoading}
          >
            {isEdit ? 'Update Template' : 'Create Template'}
          </Button>
        </div>
      </form>
    </div>
  )
}

const TaskCard = ({ task, index, errors, onUpdate, onRemove, onMove, canMoveUp, canMoveDown }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <GripVertical className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">Task {index + 1}</h3>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={!canMoveUp}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={!canMoveDown}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800"
            title="Remove task"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <Input
          label="Task Name"
          value={task.taskName}
          onChange={(e) => onUpdate('taskName', e.target.value)}
          required
          error={errors[`task_${index}_name`]}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task Description
          </label>
          <textarea
            value={task.taskDescription}
            onChange={(e) => onUpdate('taskDescription', e.target.value)}
            rows={2}
            className="input"
            placeholder="Describe what needs to be done..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Responsible Role"
            value={task.responsibleRole}
            onChange={(e) => onUpdate('responsibleRole', e.target.value)}
            required
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'hr', label: 'HR' },
              { value: 'manager', label: 'Manager' },
              { value: 'it', label: 'IT' },
              { value: 'admin', label: 'Admin' }
            ]}
          />

          <Input
            label="Due Days (relative to joining date)"
            type="number"
            value={task.dueDays}
            onChange={(e) => onUpdate('dueDays', parseInt(e.target.value) || 0)}
            required
            error={errors[`task_${index}_dueDays`]}
            helperText="0 = Day of joining, +3 = 3 days after, -2 = 2 days before"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={task.isMandatory}
              onChange={(e) => onUpdate('isMandatory', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Mandatory</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={task.requiresAttachment}
              onChange={(e) => onUpdate('requiresAttachment', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Requires Attachment</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={task.requiresApproval}
              onChange={(e) => onUpdate('requiresApproval', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Requires Approval</span>
          </label>
        </div>
      </div>
    </div>
  )
}

export default OnboardingTemplateForm

