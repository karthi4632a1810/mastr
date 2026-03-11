import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { Plus, X, AlertCircle, CheckCircle } from 'lucide-react'

const StartOnboarding = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [customTasks, setCustomTasks] = useState([])
  const [showCustomTaskForm, setShowCustomTaskForm] = useState(false)
  const [newCustomTask, setNewCustomTask] = useState({
    taskName: '',
    taskDescription: '',
    responsibleRole: 'employee',
    dueDays: 0,
    isMandatory: true,
    requiresAttachment: false,
    requiresApproval: false
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
  })

  const { data: selectedEmployeeData } = useQuery({
    queryKey: ['employee', selectedEmployee],
    queryFn: async () => {
      if (!selectedEmployee) return null
      const response = await api.get(`/employees/${selectedEmployee}`)
      return response.data.data
    },
    enabled: !!selectedEmployee
  })

  const { data: templates } = useQuery({
    queryKey: ['onboardingTemplates', selectedEmployeeData],
    queryFn: async () => {
      const params = { status: 'active' }
      const response = await api.get('/onboarding/templates', { params })
      return response.data.data || []
    },
  })

  // Filter templates based on employee's department, designation, employeeType, location
  const filteredTemplates = templates?.filter(template => {
    if (!selectedEmployeeData) return true

    // Check department
    if (template.linkedDepartments?.length > 0) {
      const matchesDept = template.linkedDepartments.some(dept => 
        dept._id === selectedEmployeeData.department?._id || dept === selectedEmployeeData.department?._id
      )
      if (!matchesDept) return false
    }

    // Check designation
    if (template.linkedDesignations?.length > 0) {
      const matchesDes = template.linkedDesignations.some(des => 
        des._id === selectedEmployeeData.designation?._id || des === selectedEmployeeData.designation?._id
      )
      if (!matchesDes) return false
    }

    // Check employee type
    if (template.linkedEmployeeTypes?.length > 0) {
      const matchesType = template.linkedEmployeeTypes.includes(selectedEmployeeData.employeeType)
      if (!matchesType) return false
    }

    // Check location
    if (template.linkedLocations?.length > 0 && selectedEmployeeData.workLocation) {
      const matchesLocation = template.linkedLocations.includes(selectedEmployeeData.workLocation)
      if (!matchesLocation) return false
    }

    return true
  }) || []

  const startMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/onboarding/start', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['onboardingInstances'])
      showToast('Onboarding started successfully', 'success')
      navigate(`/onboarding/instances/${data.data._id}`)
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to start onboarding'
      showToast(message, 'error')
      
      // Show compliance issues if any
      if (error.response?.data?.complianceChecks) {
        const checks = error.response.data.complianceChecks
        const issues = []
        if (!checks.profileComplete) issues.push('Employee profile is incomplete')
        if (!checks.documentsComplete) issues.push('Required documents are missing')
        if (!checks.offerAccepted) issues.push('Offer acceptance not confirmed')
        
        if (issues.length > 0) {
          showToast(issues.join(', '), 'error')
        }
      }
    }
  })

  const addCustomTask = () => {
    if (!newCustomTask.taskName.trim()) {
      showToast('Task name is required', 'error')
      return
    }
    setCustomTasks([...customTasks, { ...newCustomTask }])
    setNewCustomTask({
      taskName: '',
      taskDescription: '',
      responsibleRole: 'employee',
      dueDays: 0,
      isMandatory: true,
      requiresAttachment: false,
      requiresApproval: false
    })
    setShowCustomTaskForm(false)
  }

  const removeCustomTask = (index) => {
    setCustomTasks(customTasks.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!selectedEmployee) {
      showToast('Please select an employee', 'error')
      return
    }
    if (!selectedTemplate) {
      showToast('Please select a template', 'error')
      return
    }
    if (!joiningDate) {
      showToast('Please select a joining date', 'error')
      return
    }

    startMutation.mutate({
      employeeId: selectedEmployee,
      templateId: selectedTemplate,
      joiningDate,
      customTasks: customTasks.length > 0 ? customTasks : undefined
    })
  }

  const getComplianceStatus = () => {
    if (!selectedEmployeeData) return null

    const checks = {
      profileComplete: !!(
        selectedEmployeeData.firstName &&
        selectedEmployeeData.lastName &&
        selectedEmployeeData.email &&
        selectedEmployeeData.phone &&
        selectedEmployeeData.dateOfBirth &&
        selectedEmployeeData.gender &&
        selectedEmployeeData.department &&
        selectedEmployeeData.designation &&
        selectedEmployeeData.joiningDate
      ),
      documentsComplete: false,
      offerAccepted: false
    }

    // Check documents
    const hasOfferLetter = selectedEmployeeData.documents?.some(
      doc => doc.type === 'contract' || doc.name?.toLowerCase().includes('offer')
    )
    const hasIdProof = selectedEmployeeData.documents?.some(doc => doc.type === 'id_proof')
    checks.documentsComplete = hasOfferLetter && hasIdProof
    checks.offerAccepted = hasOfferLetter

    return checks
  }

  const complianceStatus = getComplianceStatus()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Start Onboarding</h1>
        <p className="text-gray-600 mt-1">Initiate onboarding process for a new employee</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Employee Selection</h2>
          
          <Select
            label="Select Employee"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            required
            options={[
              { value: '', label: 'Select an employee...' },
              ...(employees?.map(emp => ({
                value: emp._id,
                label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
              })) || [])
            ]}
          />

          {selectedEmployeeData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Employee Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Department:</span>
                  <span className="ml-2 font-medium">{selectedEmployeeData.department?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Designation:</span>
                  <span className="ml-2 font-medium">{selectedEmployeeData.designation?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Employee Type:</span>
                  <span className="ml-2 font-medium capitalize">{selectedEmployeeData.employeeType || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Location:</span>
                  <span className="ml-2 font-medium">{selectedEmployeeData.workLocation || '-'}</span>
                </div>
              </div>
            </div>
          )}

          {complianceStatus && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Compliance Status
              </h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  {complianceStatus.profileComplete ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <X className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span className={complianceStatus.profileComplete ? 'text-green-700' : 'text-red-700'}>
                    Profile Complete
                  </span>
                </div>
                <div className="flex items-center">
                  {complianceStatus.documentsComplete ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <X className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span className={complianceStatus.documentsComplete ? 'text-green-700' : 'text-red-700'}>
                    Required Documents Uploaded
                  </span>
                </div>
                <div className="flex items-center">
                  {complianceStatus.offerAccepted ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  ) : (
                    <X className="h-5 w-5 text-red-600 mr-2" />
                  )}
                  <span className={complianceStatus.offerAccepted ? 'text-green-700' : 'text-red-700'}>
                    Offer Accepted
                  </span>
                </div>
              </div>
              {(!complianceStatus.profileComplete || !complianceStatus.documentsComplete || !complianceStatus.offerAccepted) && (
                <p className="text-sm text-red-600 mt-3">
                  Please complete all compliance requirements before starting onboarding.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="card space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Template & Date</h2>
          
          <Select
            label="Select Template"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            required
            options={[
              { value: '', label: 'Select a template...' },
              ...(filteredTemplates.map(template => ({
                value: template._id,
                label: `${template.name} (${template.tasks?.length || 0} tasks)`
              })))
            ]}
            disabled={!selectedEmployee}
            helperText={!selectedEmployee ? 'Please select an employee first' : filteredTemplates.length === 0 ? 'No matching templates found for this employee' : ''}
          />

          {selectedTemplate && templates?.find(t => t._id === selectedTemplate) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Template Details</h3>
              <p className="text-sm text-gray-600">
                {templates.find(t => t._id === selectedTemplate).description || 'No description'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Tasks:</span> {templates.find(t => t._id === selectedTemplate).tasks?.length || 0}
              </p>
            </div>
          )}

          <Input
            label="Joining Date"
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="card space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Custom Tasks (Optional)</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCustomTaskForm(!showCustomTaskForm)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Task
            </Button>
          </div>

          {showCustomTaskForm && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
              <Input
                label="Task Name"
                value={newCustomTask.taskName}
                onChange={(e) => setNewCustomTask({ ...newCustomTask, taskName: e.target.value })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Description
                </label>
                <textarea
                  value={newCustomTask.taskDescription}
                  onChange={(e) => setNewCustomTask({ ...newCustomTask, taskDescription: e.target.value })}
                  rows={2}
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Responsible Role"
                  value={newCustomTask.responsibleRole}
                  onChange={(e) => setNewCustomTask({ ...newCustomTask, responsibleRole: e.target.value })}
                  options={[
                    { value: 'employee', label: 'Employee' },
                    { value: 'hr', label: 'HR' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'it', label: 'IT' },
                    { value: 'admin', label: 'Admin' }
                  ]}
                />
                <Input
                  label="Due Days (from joining date)"
                  type="number"
                  value={newCustomTask.dueDays}
                  onChange={(e) => setNewCustomTask({ ...newCustomTask, dueDays: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newCustomTask.isMandatory}
                    onChange={(e) => setNewCustomTask({ ...newCustomTask, isMandatory: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Mandatory</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newCustomTask.requiresAttachment}
                    onChange={(e) => setNewCustomTask({ ...newCustomTask, requiresAttachment: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Requires Attachment</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newCustomTask.requiresApproval}
                    onChange={(e) => setNewCustomTask({ ...newCustomTask, requiresApproval: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Requires Approval</span>
                </label>
              </div>
              <div className="flex space-x-2">
                <Button type="button" onClick={addCustomTask}>
                  Add Task
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowCustomTaskForm(false)
                    setNewCustomTask({
                      taskName: '',
                      taskDescription: '',
                      responsibleRole: 'employee',
                      dueDays: 0,
                      isMandatory: true,
                      requiresAttachment: false,
                      requiresApproval: false
                    })
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {customTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Added Custom Tasks</h3>
              {customTasks.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{task.taskName}</div>
                    {task.taskDescription && (
                      <div className="text-sm text-gray-600 mt-1">{task.taskDescription}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Due: {task.dueDays === 0 ? 'Day 0' : task.dueDays > 0 ? `Day +${task.dueDays}` : `Day ${task.dueDays}`} | 
                      Responsible: {task.responsibleRole} | 
                      {task.isMandatory && 'Mandatory'} | 
                      {task.requiresAttachment && 'Requires Attachment'} | 
                      {task.requiresApproval && 'Requires Approval'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeCustomTask(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/onboarding/instances')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={startMutation.isLoading}
            disabled={!complianceStatus || !complianceStatus.profileComplete}
          >
            Start Onboarding
          </Button>
        </div>
      </form>
    </div>
  )
}

export default StartOnboarding

