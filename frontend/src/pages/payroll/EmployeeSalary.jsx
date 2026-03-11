import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  User,
  History,
  AlertCircle,
  Check,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Percent,
  ArrowUp,
  Clock
} from 'lucide-react'
import { useState, useMemo } from 'react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'

const REASON_OPTIONS = [
  { value: 'initial', label: 'Initial Assignment' },
  { value: 'increment', label: 'Annual Increment' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'correction', label: 'Correction' },
  { value: 'structure_change', label: 'Structure Change' },
  { value: 'demotion', label: 'Demotion' },
  { value: 'other', label: 'Other' }
]

const INCREMENT_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage Increase' },
  { value: 'amount', label: 'Fixed Amount Increase' },
  { value: 'new_ctc', label: 'New CTC Value' }
]

const EmployeeSalary = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  
  // State
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showIncrementModal, setShowIncrementModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('all') // 'all' or 'unassigned'
  
  // Assignment form
  const [assignForm, setAssignForm] = useState({
    salaryStructureId: '',
    ctc: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    reason: 'initial',
    remarks: ''
  })
  
  // Increment form
  const [incrementForm, setIncrementForm] = useState({
    incrementType: 'percentage',
    value: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    reason: 'increment',
    remarks: '',
    newStructureId: ''
  })

  // Fetch all employees
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees-for-salary'],
    queryFn: async () => {
      const response = await api.get('/employees?limit=1000')
      return response.data?.data || []
    }
  })

  // Fetch employees without salary
  const { data: unassignedData } = useQuery({
    queryKey: ['employees-without-salary'],
    queryFn: async () => {
      const response = await api.get('/payroll/employees/without-salary')
      return response.data?.data || []
    }
  })

  // Fetch salary structures
  const { data: structuresData } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: async () => {
      const response = await api.get('/payroll/structures')
      return response.data?.data || []
    }
  })

  // Fetch employee salary details
  const { data: salaryDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['employee-salary-details', showDetailsModal?._id],
    queryFn: async () => {
      if (!showDetailsModal?._id) return null
      const response = await api.get(`/payroll/employees/${showDetailsModal._id}/salary`)
      return response.data?.data
    },
    enabled: !!showDetailsModal?._id
  })

  // Mutations
  const assignMutation = useMutation({
    mutationFn: async ({ employeeId, data }) => {
      return api.post(`/payroll/employees/${employeeId}/assign-structure`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employees-for-salary'])
      queryClient.invalidateQueries(['employees-without-salary'])
      queryClient.invalidateQueries(['employee-salary-details'])
      setShowAssignModal(false)
      setSelectedEmployee(null)
      resetAssignForm()
      showToast('Salary structure assigned successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to assign salary structure', 'error')
    }
  })

  const incrementMutation = useMutation({
    mutationFn: async ({ employeeId, data }) => {
      return api.post(`/payroll/employees/${employeeId}/increment`, data)
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['employees-for-salary'])
      queryClient.invalidateQueries(['employee-salary-details'])
      setShowIncrementModal(false)
      setSelectedEmployee(null)
      resetIncrementForm()
      const data = response.data?.data
      showToast(
        `Increment processed: ${data?.incrementPercentage?.toFixed(1)}% (₹${data?.incrementAmount?.toLocaleString()})`,
        'success'
      )
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to process increment', 'error')
    }
  })

  const employees = employeesData || []
  const unassignedEmployees = unassignedData || []
  const structures = structuresData || []

  const structureOptions = structures.map(s => ({
    value: s._id,
    label: `${s.name} (${s.code})`
  }))

  // Filter employees based on search and view mode
  const filteredEmployees = useMemo(() => {
    let list = viewMode === 'unassigned' ? unassignedEmployees : employees
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      list = list.filter(emp => 
        emp.firstName?.toLowerCase().includes(term) ||
        emp.lastName?.toLowerCase().includes(term) ||
        emp.employeeId?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term)
      )
    }
    
    return list
  }, [employees, unassignedEmployees, viewMode, searchTerm])

  const resetAssignForm = () => {
    setAssignForm({
      salaryStructureId: '',
      ctc: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      reason: 'initial',
      remarks: ''
    })
  }

  const resetIncrementForm = () => {
    setIncrementForm({
      incrementType: 'percentage',
      value: '',
      effectiveFrom: new Date().toISOString().split('T')[0],
      reason: 'increment',
      remarks: '',
      newStructureId: ''
    })
  }

  const handleAssignClick = (employee) => {
    setSelectedEmployee(employee)
    setAssignForm(prev => ({
      ...prev,
      ctc: employee.ctc || '',
      salaryStructureId: employee.salaryStructure?._id || ''
    }))
    setShowAssignModal(true)
  }

  const handleIncrementClick = (employee) => {
    if (!employee.ctc || employee.ctc <= 0) {
      showToast('Employee must have a CTC before processing increment', 'error')
      return
    }
    setSelectedEmployee(employee)
    setShowIncrementModal(true)
  }

  const handleAssignSubmit = (e) => {
    e.preventDefault()
    assignMutation.mutate({
      employeeId: selectedEmployee._id,
      data: {
        salaryStructureId: assignForm.salaryStructureId,
        ctc: parseFloat(assignForm.ctc),
        effectiveFrom: assignForm.effectiveFrom,
        reason: assignForm.reason,
        remarks: assignForm.remarks
      }
    })
  }

  const handleIncrementSubmit = (e) => {
    e.preventDefault()
    incrementMutation.mutate({
      employeeId: selectedEmployee._id,
      data: {
        incrementType: incrementForm.incrementType,
        value: parseFloat(incrementForm.value),
        effectiveFrom: incrementForm.effectiveFrom,
        reason: incrementForm.reason,
        remarks: incrementForm.remarks,
        newStructureId: incrementForm.newStructureId || undefined
      }
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Preview calculation
  const previewCalculation = useMemo(() => {
    if (!selectedEmployee || !incrementForm.value || incrementForm.value <= 0) return null
    
    const currentCtc = selectedEmployee.ctc || 0
    const value = parseFloat(incrementForm.value)
    
    let newCtc, increment, percentage
    
    if (incrementForm.incrementType === 'percentage') {
      percentage = value
      increment = (currentCtc * value) / 100
      newCtc = currentCtc + increment
    } else if (incrementForm.incrementType === 'amount') {
      increment = value
      percentage = currentCtc > 0 ? (value / currentCtc) * 100 : 0
      newCtc = currentCtc + value
    } else {
      newCtc = value
      increment = value - currentCtc
      percentage = currentCtc > 0 ? ((value - currentCtc) / currentCtc) * 100 : 0
    }
    
    return {
      currentCtc,
      newCtc,
      increment,
      percentage
    }
  }, [selectedEmployee, incrementForm.incrementType, incrementForm.value])

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
              {row.firstName?.[0] || ''}{row.lastName?.[0] || ''}
            </div>
            <div>
              <div className="font-medium text-gray-900">{row.firstName || ''} {row.lastName || ''}</div>
              <div className="text-xs text-gray-500">{row.employeeId || '-'}</div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'department',
      header: 'Department',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            <div className="text-sm">{row.department?.name || '-'}</div>
            <div className="text-xs text-gray-500">{row.designation?.name || '-'}</div>
          </div>
        )
      }
    },
    {
      key: 'structure',
      header: 'Salary Structure',
      render: (value, row) => {
        if (!row) return '-'
        return row.salaryStructure ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
            {row.salaryStructure.name || row.salaryStructure.code || 'Assigned'}
          </span>
        ) : (
          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Assigned
          </span>
        )
      }
    },
    {
      key: 'ctc',
      header: 'Annual CTC',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            <div className="font-semibold text-gray-900">
              {row.ctc > 0 ? formatCurrency(row.ctc) : '-'}
            </div>
            {row.calculatedComponents?.netMonthly > 0 && (
              <div className="text-xs text-gray-500">
                Monthly: {formatCurrency(row.calculatedComponents.netMonthly)}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'effective',
      header: 'Effective From',
      render: (value, row) => {
        if (!row) return '-'
        return formatDate(row.salaryEffectiveFrom)
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => {
        if (!row || !row._id) return '-'
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetailsModal(row)}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
              title="View Details"
            >
              <History className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleAssignClick(row)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
              title={row.salaryStructure ? 'Update Structure' : 'Assign Structure'}
            >
              <DollarSign className="h-4 w-4" />
            </button>
            {row.ctc > 0 && (
              <button
                onClick={() => handleIncrementClick(row)}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                title="Process Increment"
              >
                <TrendingUp className="h-4 w-4" />
              </button>
            )}
          </div>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Salary Assignment</h1>
          <p className="text-gray-600 mt-1">Assign salary structures and process increments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Total Employees</p>
              <p className="text-3xl font-bold text-blue-900">{employees.length}</p>
            </div>
            <User className="h-10 w-10 text-blue-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Salary Assigned</p>
              <p className="text-3xl font-bold text-green-900">
                {employees.filter(e => e.salaryStructure && e.ctc > 0).length}
              </p>
            </div>
            <Check className="h-10 w-10 text-green-400" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Pending Assignment</p>
              <p className="text-3xl font-bold text-amber-900">{unassignedEmployees.length}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === 'all' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Employees
            </button>
            <button
              onClick={() => setViewMode('unassigned')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === 'unassigned' 
                  ? 'bg-amber-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unassigned ({unassignedEmployees.length})
            </button>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card">
        <Table
          columns={columns}
          data={filteredEmployees}
          isLoading={employeesLoading}
          emptyMessage={viewMode === 'unassigned' 
            ? 'All employees have salary structures assigned!' 
            : 'No employees found'
          }
        />
      </div>

      {/* Assign Structure Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedEmployee(null); resetAssignForm() }}
        title={selectedEmployee?.salaryStructure ? 'Update Salary Structure' : 'Assign Salary Structure'}
        size="lg"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          {selectedEmployee && (
            <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
              </div>
              <div>
                <div className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                <div className="text-sm text-gray-500">{selectedEmployee.employeeId}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Salary Structure"
              value={assignForm.salaryStructureId}
              onChange={(e) => setAssignForm(prev => ({ ...prev, salaryStructureId: e.target.value }))}
              options={structureOptions}
              required
              placeholder="Select structure"
            />
            <Input
              label="Annual CTC (₹)"
              type="number"
              value={assignForm.ctc}
              onChange={(e) => setAssignForm(prev => ({ ...prev, ctc: e.target.value }))}
              required
              placeholder="e.g., 600000"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Effective From"
              type="date"
              value={assignForm.effectiveFrom}
              onChange={(e) => setAssignForm(prev => ({ ...prev, effectiveFrom: e.target.value }))}
              required
            />
            <Select
              label="Reason"
              value={assignForm.reason}
              onChange={(e) => setAssignForm(prev => ({ ...prev, reason: e.target.value }))}
              options={REASON_OPTIONS}
            />
          </div>

          <Input
            label="Remarks (Optional)"
            value={assignForm.remarks}
            onChange={(e) => setAssignForm(prev => ({ ...prev, remarks: e.target.value }))}
            placeholder="Additional notes..."
          />

          {assignForm.ctc && (
            <div className="bg-blue-50 p-3 rounded-lg text-sm">
              <div className="font-medium text-blue-900">Monthly Breakdown (Estimated)</div>
              <div className="text-blue-700 mt-1">
                Monthly CTC: {formatCurrency(parseFloat(assignForm.ctc) / 12)}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setShowAssignModal(false); setSelectedEmployee(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={assignMutation.isLoading}>
              {selectedEmployee?.salaryStructure ? 'Update Assignment' : 'Assign Structure'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Increment Modal */}
      <Modal
        isOpen={showIncrementModal}
        onClose={() => { setShowIncrementModal(false); setSelectedEmployee(null); resetIncrementForm() }}
        title="Process Increment"
        size="lg"
      >
        <form onSubmit={handleIncrementSubmit} className="space-y-4">
          {selectedEmployee && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                    {selectedEmployee.firstName?.[0]}{selectedEmployee.lastName?.[0]}
                  </div>
                  <div>
                    <div className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                    <div className="text-sm text-gray-500">{selectedEmployee.employeeId}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Current CTC</div>
                  <div className="font-semibold text-lg">{formatCurrency(selectedEmployee.ctc)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Increment Type"
              value={incrementForm.incrementType}
              onChange={(e) => setIncrementForm(prev => ({ ...prev, incrementType: e.target.value, value: '' }))}
              options={INCREMENT_TYPE_OPTIONS}
            />
            <Input
              label={
                incrementForm.incrementType === 'percentage' ? 'Increment Percentage (%)' :
                incrementForm.incrementType === 'amount' ? 'Increment Amount (₹)' :
                'New CTC (₹)'
              }
              type="number"
              step={incrementForm.incrementType === 'percentage' ? '0.1' : '1'}
              value={incrementForm.value}
              onChange={(e) => setIncrementForm(prev => ({ ...prev, value: e.target.value }))}
              required
              placeholder={
                incrementForm.incrementType === 'percentage' ? 'e.g., 10' :
                incrementForm.incrementType === 'amount' ? 'e.g., 50000' :
                'e.g., 700000'
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Effective From"
              type="date"
              value={incrementForm.effectiveFrom}
              onChange={(e) => setIncrementForm(prev => ({ ...prev, effectiveFrom: e.target.value }))}
              required
            />
            <Select
              label="Reason"
              value={incrementForm.reason}
              onChange={(e) => setIncrementForm(prev => ({ ...prev, reason: e.target.value }))}
              options={REASON_OPTIONS}
            />
          </div>

          <Select
            label="Change Structure (Optional)"
            value={incrementForm.newStructureId}
            onChange={(e) => setIncrementForm(prev => ({ ...prev, newStructureId: e.target.value }))}
            options={[{ value: '', label: 'Keep Current Structure' }, ...structureOptions]}
          />

          <Input
            label="Remarks (Optional)"
            value={incrementForm.remarks}
            onChange={(e) => setIncrementForm(prev => ({ ...prev, remarks: e.target.value }))}
            placeholder="Performance review notes, etc..."
          />

          {/* Preview */}
          {previewCalculation && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="font-medium text-green-900 mb-3 flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                Increment Preview
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Current CTC</div>
                  <div className="font-semibold">{formatCurrency(previewCalculation.currentCtc)}</div>
                </div>
                <div>
                  <div className="text-gray-500">Increment</div>
                  <div className="font-semibold text-green-700">
                    +{formatCurrency(previewCalculation.increment)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">Percentage</div>
                  <div className="font-semibold text-green-700">
                    +{previewCalculation.percentage.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">New CTC</div>
                  <div className="font-semibold text-green-900">{formatCurrency(previewCalculation.newCtc)}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setShowIncrementModal(false); setSelectedEmployee(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={incrementMutation.isLoading}>
              Process Increment
            </Button>
          </div>
        </form>
      </Modal>

      {/* Salary Details Modal */}
      <Modal
        isOpen={!!showDetailsModal}
        onClose={() => setShowDetailsModal(null)}
        title="Salary Details"
        size="xl"
      >
        {detailsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : salaryDetails ? (
          <div className="space-y-6">
            {/* Current Salary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Current Salary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Structure</div>
                  <div className="font-medium">{salaryDetails.currentSalary?.salaryStructure?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Annual CTC</div>
                  <div className="font-semibold text-lg">{formatCurrency(salaryDetails.currentSalary?.ctc)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Monthly Net</div>
                  <div className="font-medium">{formatCurrency(salaryDetails.currentSalary?.monthlySalary)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Effective From</div>
                  <div className="font-medium">{formatDate(salaryDetails.currentSalary?.effectiveFrom)}</div>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            {salaryDetails.breakdown && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-green-700 mb-2">Earnings (Monthly)</h3>
                  <div className="space-y-1">
                    {salaryDetails.breakdown.earnings?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-green-50 p-2 rounded">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Earnings</span>
                      <span className="text-green-700">{formatCurrency(salaryDetails.breakdown.totalEarnings)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-red-700 mb-2">Deductions (Monthly)</h3>
                  <div className="space-y-1">
                    {salaryDetails.breakdown.deductions?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-red-50 p-2 rounded">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Deductions</span>
                      <span className="text-red-700">{formatCurrency(salaryDetails.breakdown.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* History */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Salary History
              </h3>
              {salaryDetails.history?.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {salaryDetails.history.map((entry, idx) => (
                    <div key={idx} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entry.structureName}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              entry.reason === 'increment' ? 'bg-green-100 text-green-700' :
                              entry.reason === 'promotion' ? 'bg-blue-100 text-blue-700' :
                              entry.reason === 'initial' ? 'bg-gray-100 text-gray-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {entry.reason?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {formatDate(entry.effectiveFrom)} - {entry.effectiveTo ? formatDate(entry.effectiveTo) : 'Present'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(entry.ctc)}</div>
                          {entry.incrementPercentage > 0 && (
                            <div className="text-xs text-green-600">
                              +{entry.incrementPercentage?.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>
                      {entry.remarks && (
                        <div className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                          {entry.remarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No salary history available</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No salary data available</p>
        )}
      </Modal>
    </div>
  )
}

export default EmployeeSalary

