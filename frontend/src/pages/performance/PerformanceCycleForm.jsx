import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useEffect } from 'react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { ArrowLeft, Save, Users, Calendar, Eye } from 'lucide-react'
import Modal from '../../components/Modal'

const PerformanceCycleForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const isEdit = !!id
  const [showEmployeesModal, setShowEmployeesModal] = useState(false)
  const [eligibleEmployees, setEligibleEmployees] = useState([])

  const [formData, setFormData] = useState({
    name: '',
    cycleType: 'annual',
    startDate: '',
    endDate: '',
    status: 'draft',
    associatedDepartments: [],
    visibilitySettings: {
      goalStatusVisibleTo: ['employee', 'manager'],
      ratingsVisibleTo: ['employee', 'manager', 'hr']
    },
    employeeInclusion: {
      includeAllActive: true,
      excludeNoticePeriod: false,
      includedEmployees: [],
      excludedEmployees: []
    },
    workflowWindows: {
      goalSetting: {
        startDate: '',
        endDate: '',
        enabled: true
      },
      selfAssessment: {
        startDate: '',
        endDate: '',
        enabled: true
      },
      managerReview: {
        startDate: '',
        endDate: '',
        enabled: true
      }
    },
    notifications: {
      goalSettingEnabled: true,
      selfAssessmentEnabled: true,
      managerReviewEnabled: true
    }
  })

  const [errors, setErrors] = useState({})

  const { data: cycle, isLoading: cycleLoading } = useQuery({
    queryKey: ['performanceCycle', id],
    queryFn: async () => {
      const response = await api.get(`/performance-cycles/${id}`)
      return response.data.data
    },
    enabled: isEdit,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          name: data.name || '',
          cycleType: data.cycleType || 'annual',
          startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : '',
          endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
          status: data.status || 'draft',
          associatedDepartments: data.associatedDepartments?.map(d => d._id || d) || [],
          visibilitySettings: {
            goalStatusVisibleTo: data.visibilitySettings?.goalStatusVisibleTo || ['employee', 'manager'],
            ratingsVisibleTo: data.visibilitySettings?.ratingsVisibleTo || ['employee', 'manager', 'hr']
          },
          employeeInclusion: {
            includeAllActive: data.employeeInclusion?.includeAllActive !== false,
            excludeNoticePeriod: data.employeeInclusion?.excludeNoticePeriod || false,
            includedEmployees: data.employeeInclusion?.includedEmployees?.map(e => e._id || e) || [],
            excludedEmployees: data.employeeInclusion?.excludedEmployees?.map(e => e._id || e) || []
          },
          workflowWindows: {
            goalSetting: {
              startDate: data.workflowWindows?.goalSetting?.startDate 
                ? new Date(data.workflowWindows.goalSetting.startDate).toISOString().split('T')[0] 
                : '',
              endDate: data.workflowWindows?.goalSetting?.endDate 
                ? new Date(data.workflowWindows.goalSetting.endDate).toISOString().split('T')[0] 
                : '',
              enabled: data.workflowWindows?.goalSetting?.enabled !== false
            },
            selfAssessment: {
              startDate: data.workflowWindows?.selfAssessment?.startDate 
                ? new Date(data.workflowWindows.selfAssessment.startDate).toISOString().split('T')[0] 
                : '',
              endDate: data.workflowWindows?.selfAssessment?.endDate 
                ? new Date(data.workflowWindows.selfAssessment.endDate).toISOString().split('T')[0] 
                : '',
              enabled: data.workflowWindows?.selfAssessment?.enabled !== false
            },
            managerReview: {
              startDate: data.workflowWindows?.managerReview?.startDate 
                ? new Date(data.workflowWindows.managerReview.startDate).toISOString().split('T')[0] 
                : '',
              endDate: data.workflowWindows?.managerReview?.endDate 
                ? new Date(data.workflowWindows.managerReview.endDate).toISOString().split('T')[0] 
                : '',
              enabled: data.workflowWindows?.managerReview?.enabled !== false
            }
          },
          notifications: {
            goalSettingEnabled: data.notifications?.goalSettingEnabled !== false,
            selfAssessmentEnabled: data.notifications?.selfAssessmentEnabled !== false,
            managerReviewEnabled: data.notifications?.managerReviewEnabled !== false
          }
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

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
  })

  const { data: eligibleEmployeesData } = useQuery({
    queryKey: ['eligibleEmployees', id],
    queryFn: async () => {
      if (!id) return null
      const response = await api.get(`/performance-cycles/${id}/eligible-employees`)
      return response.data.data || []
    },
    enabled: !!id && showEmployeesModal
  })

  useEffect(() => {
    if (eligibleEmployeesData) {
      setEligibleEmployees(eligibleEmployeesData)
    }
  }, [eligibleEmployeesData])

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/performance-cycles', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['performanceCycles'])
      showToast('Performance cycle created successfully', 'success')
      navigate(`/performance/cycles/${data.data._id}`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create cycle', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.put(`/performance-cycles/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['performanceCycles'])
      queryClient.invalidateQueries(['performanceCycle', id])
      showToast('Performance cycle updated successfully', 'success')
      navigate(`/performance/cycles/${id}`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update cycle', 'error')
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors)
      }
    }
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: grandchild 
            ? { ...prev[parent][child], [grandchild]: type === 'checkbox' ? checked : value }
            : (type === 'checkbox' ? checked : value)
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
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

  const handleVisibilityChange = (setting, role, checked) => {
    setFormData(prev => ({
      ...prev,
      visibilitySettings: {
        ...prev.visibilitySettings,
        [setting]: checked
          ? [...prev.visibilitySettings[setting], role]
          : prev.visibilitySettings[setting].filter(r => r !== role)
      }
    }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Cycle name is required'
    if (!formData.startDate) newErrors.startDate = 'Start date is required'
    if (!formData.endDate) newErrors.endDate = 'End date is required'
    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date'
    }

    // Validate workflow windows
    if (formData.workflowWindows.goalSetting.enabled) {
      if (!formData.workflowWindows.goalSetting.startDate || !formData.workflowWindows.goalSetting.endDate) {
        newErrors.goalSettingWindow = 'Goal setting window dates are required'
      }
    }
    if (formData.workflowWindows.selfAssessment.enabled) {
      if (!formData.workflowWindows.selfAssessment.startDate || !formData.workflowWindows.selfAssessment.endDate) {
        newErrors.selfAssessmentWindow = 'Self-assessment window dates are required'
      }
    }
    if (formData.workflowWindows.managerReview.enabled) {
      if (!formData.workflowWindows.managerReview.startDate || !formData.workflowWindows.managerReview.endDate) {
        newErrors.managerReviewWindow = 'Manager review window dates are required'
      }
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
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      workflowWindows: {
        goalSetting: {
          ...formData.workflowWindows.goalSetting,
          startDate: formData.workflowWindows.goalSetting.enabled && formData.workflowWindows.goalSetting.startDate
            ? new Date(formData.workflowWindows.goalSetting.startDate).toISOString()
            : null,
          endDate: formData.workflowWindows.goalSetting.enabled && formData.workflowWindows.goalSetting.endDate
            ? new Date(formData.workflowWindows.goalSetting.endDate).toISOString()
            : null
        },
        selfAssessment: {
          ...formData.workflowWindows.selfAssessment,
          startDate: formData.workflowWindows.selfAssessment.enabled && formData.workflowWindows.selfAssessment.startDate
            ? new Date(formData.workflowWindows.selfAssessment.startDate).toISOString()
            : null,
          endDate: formData.workflowWindows.selfAssessment.enabled && formData.workflowWindows.selfAssessment.endDate
            ? new Date(formData.workflowWindows.selfAssessment.endDate).toISOString()
            : null
        },
        managerReview: {
          ...formData.workflowWindows.managerReview,
          startDate: formData.workflowWindows.managerReview.enabled && formData.workflowWindows.managerReview.startDate
            ? new Date(formData.workflowWindows.managerReview.startDate).toISOString()
            : null,
          endDate: formData.workflowWindows.managerReview.enabled && formData.workflowWindows.managerReview.endDate
            ? new Date(formData.workflowWindows.managerReview.endDate).toISOString()
            : null
        }
      }
    }

    if (isEdit) {
      updateMutation.mutate(submitData)
    } else {
      createMutation.mutate(submitData)
    }
  }

  if (isEdit && cycleLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/performance/cycles')}
          className="text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEdit ? 'Edit Performance Cycle' : 'Create Performance Cycle'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEdit ? 'Update cycle configuration' : 'Configure a new performance review cycle'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
          
          <Input
            label="Cycle Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            error={errors.name}
            placeholder="e.g., H1 2025 Review"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Cycle Type"
              name="cycleType"
              value={formData.cycleType}
              onChange={handleChange}
              required
              options={[
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'half_yearly', label: 'Half-Yearly' },
                { value: 'annual', label: 'Annual' }
              ]}
            />

            <Input
              label="Status"
              name="status"
              value={formData.status}
              disabled
              helperText="Status will be 'Draft' for new cycles"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              required
              error={errors.startDate}
            />

            <Input
              label="End Date"
              name="endDate"
              type="date"
              value={formData.endDate}
              onChange={handleChange}
              required
              error={errors.endDate}
              min={formData.startDate}
            />
          </div>
        </div>

        {/* Department Association */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Department Association</h2>
          <p className="text-sm text-gray-600">
            Leave empty to include all departments. Select specific departments to restrict the cycle.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Associated Departments (Optional)
            </label>
            <select
              multiple
              value={formData.associatedDepartments}
              onChange={(e) => handleMultiSelect('associatedDepartments', e.target)}
              className="input"
              size="4"
            >
              {departments?.map(dept => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Hold Ctrl/Cmd to select multiple. Leave empty for all departments.
            </p>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Visibility Settings</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Status Visible To
            </label>
            <div className="space-y-2">
              {['employee', 'manager', 'hr', 'admin'].map(role => (
                <label key={role} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.visibilitySettings.goalStatusVisibleTo.includes(role)}
                    onChange={(e) => handleVisibilityChange('goalStatusVisibleTo', role, e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ratings Visible To
            </label>
            <div className="space-y-2">
              {['employee', 'manager', 'hr', 'admin'].map(role => (
                <label key={role} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.visibilitySettings.ratingsVisibleTo.includes(role)}
                    onChange={(e) => handleVisibilityChange('ratingsVisibleTo', role, e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">{role}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Employee Inclusion */}
        <div className="card space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Employee Inclusion</h2>
            {isEdit && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowEmployeesModal(true)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Eligible Employees
              </Button>
            )}
          </div>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="employeeInclusion.includeAllActive"
              checked={formData.employeeInclusion.includeAllActive}
              onChange={handleChange}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Include all active employees</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="employeeInclusion.excludeNoticePeriod"
              checked={formData.employeeInclusion.excludeNoticePeriod}
              onChange={handleChange}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Exclude employees on notice period</span>
          </label>

          {!formData.employeeInclusion.includeAllActive && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manually Include Employees
              </label>
              <select
                multiple
                value={formData.employeeInclusion.includedEmployees}
                onChange={(e) => handleMultiSelect('employeeInclusion.includedEmployees', e.target)}
                className="input"
                size="6"
              >
                {employees?.map(emp => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Hold Ctrl/Cmd to select multiple employees.
              </p>
            </div>
          )}
        </div>

        {/* Workflow Windows */}
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Workflow Windows</h2>
          
          {/* Goal Setting Window */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Goal Setting Window</h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="workflowWindows.goalSetting.enabled"
                  checked={formData.workflowWindows.goalSetting.enabled}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Enable</span>
              </label>
            </div>
            {formData.workflowWindows.goalSetting.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  name="workflowWindows.goalSetting.startDate"
                  type="date"
                  value={formData.workflowWindows.goalSetting.startDate}
                  onChange={handleChange}
                  min={formData.startDate}
                  max={formData.endDate}
                />
                <Input
                  label="End Date"
                  name="workflowWindows.goalSetting.endDate"
                  type="date"
                  value={formData.workflowWindows.goalSetting.endDate}
                  onChange={handleChange}
                  min={formData.workflowWindows.goalSetting.startDate || formData.startDate}
                  max={formData.endDate}
                />
              </div>
            )}
            <label className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                name="notifications.goalSettingEnabled"
                checked={formData.notifications.goalSettingEnabled}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Send notifications</span>
            </label>
          </div>

          {/* Self-Assessment Window */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Self-Assessment Window</h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="workflowWindows.selfAssessment.enabled"
                  checked={formData.workflowWindows.selfAssessment.enabled}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Enable</span>
              </label>
            </div>
            {formData.workflowWindows.selfAssessment.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  name="workflowWindows.selfAssessment.startDate"
                  type="date"
                  value={formData.workflowWindows.selfAssessment.startDate}
                  onChange={handleChange}
                  min={formData.workflowWindows.goalSetting.endDate || formData.startDate}
                  max={formData.endDate}
                />
                <Input
                  label="End Date"
                  name="workflowWindows.selfAssessment.endDate"
                  type="date"
                  value={formData.workflowWindows.selfAssessment.endDate}
                  onChange={handleChange}
                  min={formData.workflowWindows.selfAssessment.startDate || formData.startDate}
                  max={formData.endDate}
                />
              </div>
            )}
            <label className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                name="notifications.selfAssessmentEnabled"
                checked={formData.notifications.selfAssessmentEnabled}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Send notifications</span>
            </label>
          </div>

          {/* Manager Review Window */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Manager Review Window</h3>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="workflowWindows.managerReview.enabled"
                  checked={formData.workflowWindows.managerReview.enabled}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Enable</span>
              </label>
            </div>
            {formData.workflowWindows.managerReview.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  name="workflowWindows.managerReview.startDate"
                  type="date"
                  value={formData.workflowWindows.managerReview.startDate}
                  onChange={handleChange}
                  min={formData.workflowWindows.selfAssessment.endDate || formData.startDate}
                  max={formData.endDate}
                />
                <Input
                  label="End Date"
                  name="workflowWindows.managerReview.endDate"
                  type="date"
                  value={formData.workflowWindows.managerReview.endDate}
                  onChange={handleChange}
                  min={formData.workflowWindows.managerReview.startDate || formData.startDate}
                  max={formData.endDate}
                />
              </div>
            )}
            <label className="flex items-center space-x-2 mt-4">
              <input
                type="checkbox"
                name="notifications.managerReviewEnabled"
                checked={formData.notifications.managerReviewEnabled}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Send notifications</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/performance/cycles')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={createMutation.isLoading || updateMutation.isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update Cycle' : 'Create Cycle'}
          </Button>
        </div>
      </form>

      {/* Eligible Employees Modal */}
      <Modal
        isOpen={showEmployeesModal}
        onClose={() => setShowEmployeesModal(false)}
        title="Eligible Employees"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Employees eligible for this performance cycle based on current inclusion settings.
          </p>
          {eligibleEmployees.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eligibleEmployees.map((emp) => (
                    <tr key={emp._id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {emp.firstName} {emp.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.employeeId}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.department?.name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.designation?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">No eligible employees found</p>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default PerformanceCycleForm

