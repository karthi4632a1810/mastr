import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react'

const GoalForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    performanceCycleId: '',
    employeeId: '',
    title: '',
    description: '',
    category: 'productivity',
    weightage: 0,
    dueDate: '',
    successCriteria: '',
    isMandatory: false
  })

  const [errors, setErrors] = useState({})
  const [totalWeightage, setTotalWeightage] = useState(0)

  const { data: goal, isLoading: goalLoading } = useQuery({
    queryKey: ['goal', id],
    queryFn: async () => {
      const response = await api.get(`/goals/${id}`)
      return response.data.data
    },
    enabled: isEdit,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          performanceCycleId: data.performanceCycle?._id || '',
          employeeId: data.employee?._id || '',
          title: data.title || '',
          description: data.description || '',
          category: data.category || 'productivity',
          weightage: data.weightage || 0,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '',
          successCriteria: data.successCriteria || '',
          isMandatory: data.isMandatory || false
        })
        // Fetch current weightage
        if (data.performanceCycle?._id && data.employee?._id) {
          fetchWeightage(data.performanceCycle._id, data.employee._id, data._id)
        }
      }
    }
  })

  const { data: cycles } = useQuery({
    queryKey: ['performanceCycles', 'active'],
    queryFn: async () => {
      const response = await api.get('/performance-cycles', { params: { status: 'active' } })
      return response.data.data || []
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
  })

  // For employees, get their own data
  const { data: employeeData } = useQuery({
    queryKey: ['myEmployee'],
    queryFn: async () => {
      const response = await api.get('/employees/me')
      return response.data.data
    },
    enabled: user?.role === 'employee' && !isEdit
  })

  // Get current weightage for selected employee and cycle
  const fetchWeightage = async (cycleId, empId, excludeGoalId = null) => {
    try {
      const params = excludeGoalId ? { exclude: excludeGoalId } : {}
      const response = await api.get(`/goals/weightage/${cycleId}/${empId}`, { params })
      setTotalWeightage(response.data.data.totalWeightage || 0)
    } catch (error) {
      console.error('Failed to fetch weightage:', error)
      setTotalWeightage(0)
    }
  }

  useEffect(() => {
    if (formData.performanceCycleId && formData.employeeId && !isEdit) {
      fetchWeightage(formData.performanceCycleId, formData.employeeId)
    }
  }, [formData.performanceCycleId, formData.employeeId, isEdit])

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/goals', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['goals'])
      showToast(data.message, 'success')
      if (data.warning) {
        showToast(data.warning, 'warning')
      }
      navigate(`/performance/goals/${data.data._id}`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create goal', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/goals/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals'])
      queryClient.invalidateQueries(['goal', id])
      showToast('Goal updated successfully', 'success')
      navigate(`/performance/goals/${id}`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update goal', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Update weightage and fetch new total
    if (name === 'weightage' || name === 'performanceCycleId' || name === 'employeeId') {
      if (name === 'weightage') {
        const newWeightage = parseFloat(value) || 0
        setFormData(prev => ({ ...prev, weightage: newWeightage }))
      }
      // Fetch updated weightage after a short delay
      setTimeout(() => {
        if (formData.performanceCycleId && formData.employeeId && name !== 'weightage') {
          fetchWeightage(
            name === 'performanceCycleId' ? value : formData.performanceCycleId,
            name === 'employeeId' ? value : formData.employeeId,
            isEdit ? id : null
          )
        } else if (name === 'weightage') {
          const newTotal = totalWeightage - (formData.weightage || 0) + (parseFloat(value) || 0)
          setTotalWeightage(newTotal)
        }
      }, 500)
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.performanceCycleId) newErrors.performanceCycleId = 'Performance cycle is required'
    if (!formData.employeeId) newErrors.employeeId = 'Employee is required'
    if (!formData.title.trim()) newErrors.title = 'Goal title is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (formData.weightage === undefined || formData.weightage === null || formData.weightage < 0) {
      newErrors.weightage = 'Weightage is required and must be 0 or greater'
    }
    if (formData.weightage > 100) {
      newErrors.weightage = 'Weightage cannot exceed 100%'
    }
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required'

    // Validate total weightage
    const newTotal = isEdit 
      ? totalWeightage - (goal?.weightage || 0) + (formData.weightage || 0)
      : totalWeightage + (formData.weightage || 0)
    
    if (newTotal > 100) {
      newErrors.weightage = `Total weightage would exceed 100%. Current: ${totalWeightage}%, Adding: ${formData.weightage}%, Total: ${newTotal}%`
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
      performanceCycleId: formData.performanceCycleId,
      employeeId: formData.employeeId,
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      weightage: parseFloat(formData.weightage),
      dueDate: formData.dueDate,
      successCriteria: formData.successCriteria.trim(),
      isMandatory: formData.isMandatory
    }

    if (isEdit) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  if (isEdit && goalLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Pre-fill employee for employees
  useEffect(() => {
    if (user?.role === 'employee' && employeeData && !formData.employeeId) {
      setFormData(prev => ({ ...prev, employeeId: employeeData._id }))
    }
  }, [employeeData, user, formData.employeeId])

  const newTotalWeightage = isEdit 
    ? totalWeightage - (goal?.weightage || 0) + (formData.weightage || 0)
    : totalWeightage + (formData.weightage || 0)

  return (
    <div>
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/performance/goals')}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Goal' : user?.role === 'employee' ? 'Propose Goal' : 'Create Goal'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update goal details' : 'Define a new goal or key result area'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Performance Cycle"
              name="performanceCycleId"
              value={formData.performanceCycleId}
              onChange={handleChange}
              required
              disabled={isEdit}
              error={errors.performanceCycleId}
              options={[
                { value: '', label: 'Select a performance cycle...' },
                ...(cycles?.map(cycle => ({
                  value: cycle._id,
                  label: `${cycle.name} (${new Date(cycle.startDate).toLocaleDateString()} - ${new Date(cycle.endDate).toLocaleDateString()})`
                })) || [])
              ]}
            />

            <Select
              label="Employee"
              name="employeeId"
              value={formData.employeeId}
              onChange={handleChange}
              required
              disabled={isEdit || user?.role === 'employee'}
              error={errors.employeeId}
              options={[
                { value: '', label: 'Select an employee...' },
                ...(employees?.map(emp => ({
                  value: emp._id,
                  label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
                })) || [])
              ]}
            />
          </div>

          <Input
            label="Goal Title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            error={errors.title}
            placeholder="Enter a clear and specific goal title"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="input"
              placeholder="Provide detailed description of the goal..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              error={errors.category}
              options={[
                { value: 'productivity', label: 'Productivity' },
                { value: 'leadership', label: 'Leadership' },
                { value: 'behavioural', label: 'Behavioural' },
                { value: 'technical', label: 'Technical' }
              ]}
            />

            <Input
              label="Due Date"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={handleChange}
              required
              error={errors.dueDate}
              min={formData.performanceCycleId && cycles?.find(c => c._id === formData.performanceCycleId) 
                ? new Date(cycles.find(c => c._id === formData.performanceCycleId).startDate).toISOString().split('T')[0]
                : undefined}
              max={formData.performanceCycleId && cycles?.find(c => c._id === formData.performanceCycleId)
                ? new Date(cycles.find(c => c._id === formData.performanceCycleId).endDate).toISOString().split('T')[0]
                : undefined}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Success Criteria / Measurable Outcomes
            </label>
            <textarea
              name="successCriteria"
              value={formData.successCriteria}
              onChange={handleChange}
              rows={3}
              className="input"
              placeholder="Define clear, measurable criteria for success (e.g., 'Increase sales by 20%', 'Complete 5 training courses')"
            />
            <p className="mt-1 text-xs text-gray-500">
              Specify how success will be measured and what outcomes are expected
            </p>
          </div>
        </div>

        {/* Weightage */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Weightage</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Weightage (%)"
              name="weightage"
              type="number"
              value={formData.weightage}
              onChange={handleChange}
              required
              error={errors.weightage}
              min="0"
              max="100"
              step="0.01"
              helperText="The percentage weight this goal carries in the overall performance evaluation"
            />

            <div className="flex items-end">
              <div className="w-full p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Weightage</div>
                <div className="flex items-center space-x-2">
                  <div className={`text-2xl font-bold ${
                    newTotalWeightage === 100 ? 'text-green-600' :
                    newTotalWeightage > 100 ? 'text-red-600' :
                    'text-gray-900'
                  }`}>
                    {newTotalWeightage.toFixed(2)}%
                  </div>
                  {newTotalWeightage === 100 && (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  )}
                  {newTotalWeightage > 100 && (
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {newTotalWeightage === 100 
                    ? '✓ Total equals 100%' 
                    : newTotalWeightage > 100 
                    ? '⚠ Total exceeds 100%' 
                    : `Need ${(100 - newTotalWeightage).toFixed(2)}% more to reach 100%`}
                </div>
              </div>
            </div>
          </div>

          {(user?.role === 'admin' || user?.role === 'hr') && (
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isMandatory"
                checked={formData.isMandatory}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">This is a mandatory goal for the employee's department</span>
            </label>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/performance/goals')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createMutation.isLoading || updateMutation.isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update Goal' : user?.role === 'employee' ? 'Propose Goal' : 'Create Goal'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default GoalForm

