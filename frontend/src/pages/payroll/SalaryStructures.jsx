import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { 
  Plus, 
  Edit2, 
  Copy, 
  Trash2, 
  DollarSign,
  Calculator,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Info,
  History,
  Settings,
  Shield
} from 'lucide-react'
import { useState, useMemo } from 'react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'

const CATEGORY_OPTIONS = [
  { value: 'staff', label: 'Staff' },
  { value: 'manager', label: 'Manager' },
  { value: 'executive', label: 'Executive' },
  { value: 'intern', label: 'Intern' },
  { value: 'contract', label: 'Contract' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'custom', label: 'Custom' }
]

const CALC_TYPE_OPTIONS = [
  { value: 'use_default', label: 'Use Default' },
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'percentage_of_basic', label: '% of Basic' },
  { value: 'percentage_of_ctc', label: '% of CTC' },
  { value: 'formula', label: 'Formula' }
]

const SalaryStructures = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  
  // State
  const [showStructureModal, setShowStructureModal] = useState(false)
  const [showComponentModal, setShowComponentModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [selectedStructure, setSelectedStructure] = useState(null)
  const [expandedStructure, setExpandedStructure] = useState(null)
  const [activeTab, setActiveTab] = useState('structures')
  
  // Form states
  const [structureForm, setStructureForm] = useState({
    name: '',
    code: '',
    description: '',
    category: 'staff',
    pfApplicable: true,
    esiApplicable: true,
    ptApplicable: true,
    tdsApplicable: true,
    earnings: [],
    deductions: []
  })
  
  const [componentForm, setComponentForm] = useState({
    name: '',
    code: '',
    type: 'earning',
    category: 'other_earning',
    calculationType: 'fixed',
    defaultValue: 0,
    taxability: 'taxable',
    isStatutory: false,
    statutoryType: 'none',
    isMandatory: false,
    showInPayslip: true
  })
  
  const [cloneForm, setCloneForm] = useState({ name: '', code: '', description: '' })
  const [previewCtc, setPreviewCtc] = useState(600000)

  // Fetch salary structures
  const { data: structuresData, isLoading: structuresLoading } = useQuery({
    queryKey: ['salary-structures'],
    queryFn: async () => {
      const response = await api.get('/payroll/structures')
      return response.data?.data || []
    }
  })

  // Fetch salary components
  const { data: componentsData, isLoading: componentsLoading } = useQuery({
    queryKey: ['salary-components'],
    queryFn: async () => {
      const response = await api.get('/payroll/components?includeInactive=true')
      return response.data
    }
  })

  // Fetch statutory config
  const { data: statutoryConfig } = useQuery({
    queryKey: ['statutory-config'],
    queryFn: async () => {
      const response = await api.get('/payroll/statutory-config')
      return response.data?.data
    }
  })

  // Mutations
  const createStructureMutation = useMutation({
    mutationFn: async (data) => api.post('/payroll/structures', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-structures'])
      setShowStructureModal(false)
      resetStructureForm()
      showToast('Salary structure created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create structure', 'error')
    }
  })

  const updateStructureMutation = useMutation({
    mutationFn: async ({ id, data }) => api.put(`/payroll/structures/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-structures'])
      setShowStructureModal(false)
      setSelectedStructure(null)
      resetStructureForm()
      showToast('Salary structure updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update structure', 'error')
    }
  })

  const cloneStructureMutation = useMutation({
    mutationFn: async ({ id, data }) => api.post(`/payroll/structures/${id}/clone`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-structures'])
      setShowCloneModal(false)
      setSelectedStructure(null)
      setCloneForm({ name: '', code: '', description: '' })
      showToast('Salary structure cloned successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to clone structure', 'error')
    }
  })

  const deleteStructureMutation = useMutation({
    mutationFn: async (id) => api.delete(`/payroll/structures/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-structures'])
      showToast('Salary structure deactivated', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete structure', 'error')
    }
  })

  const createComponentMutation = useMutation({
    mutationFn: async (data) => api.post('/payroll/components', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-components'])
      setShowComponentModal(false)
      resetComponentForm()
      showToast('Salary component created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create component', 'error')
    }
  })

  const seedComponentsMutation = useMutation({
    mutationFn: async () => api.post('/payroll/components/seed'),
    onSuccess: () => {
      queryClient.invalidateQueries(['salary-components'])
      showToast('Default components created', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to seed components', 'error')
    }
  })

  // Preview calculation
  const { data: previewData, refetch: refetchPreview } = useQuery({
    queryKey: ['salary-preview', selectedStructure?._id, previewCtc],
    queryFn: async () => {
      if (!selectedStructure?._id) return null
      const response = await api.post('/payroll/calculate-preview', {
        structureId: selectedStructure._id,
        ctc: previewCtc
      })
      return response.data?.data
    },
    enabled: !!selectedStructure?._id && showPreviewModal
  })

  const structures = structuresData || []
  const components = componentsData?.data || []
  const groupedComponents = componentsData?.grouped || { earnings: [], deductions: [] }

  const resetStructureForm = () => {
    setStructureForm({
      name: '',
      code: '',
      description: '',
      category: 'staff',
      pfApplicable: true,
      esiApplicable: true,
      ptApplicable: true,
      tdsApplicable: true,
      earnings: [],
      deductions: []
    })
  }

  const resetComponentForm = () => {
    setComponentForm({
      name: '',
      code: '',
      type: 'earning',
      category: 'other_earning',
      calculationType: 'fixed',
      defaultValue: 0,
      taxability: 'taxable',
      isStatutory: false,
      statutoryType: 'none',
      isMandatory: false,
      showInPayslip: true
    })
  }

  const handleEditStructure = (structure) => {
    setSelectedStructure(structure)
    setStructureForm({
      name: structure.name,
      code: structure.code,
      description: structure.description || '',
      category: structure.category,
      pfApplicable: structure.pfApplicable,
      esiApplicable: structure.esiApplicable,
      ptApplicable: structure.ptApplicable,
      tdsApplicable: structure.tdsApplicable,
      earnings: structure.earnings || [],
      deductions: structure.deductions || []
    })
    setShowStructureModal(true)
  }

  const handleCloneStructure = (structure) => {
    setSelectedStructure(structure)
    setCloneForm({
      name: `${structure.name} (Copy)`,
      code: `${structure.code}_COPY`,
      description: `Cloned from ${structure.name}`
    })
    setShowCloneModal(true)
  }

  const handlePreviewStructure = (structure) => {
    setSelectedStructure(structure)
    setShowPreviewModal(true)
  }

  const handleDeleteStructure = (structure) => {
    if (window.confirm(`Are you sure you want to deactivate "${structure.name}"?`)) {
      deleteStructureMutation.mutate(structure._id)
    }
  }

  const handleStructureSubmit = (e) => {
    e.preventDefault()
    
    if (selectedStructure) {
      updateStructureMutation.mutate({ id: selectedStructure._id, data: structureForm })
    } else {
      createStructureMutation.mutate(structureForm)
    }
  }

  const handleCloneSubmit = (e) => {
    e.preventDefault()
    cloneStructureMutation.mutate({ id: selectedStructure._id, data: cloneForm })
  }

  const handleComponentSubmit = (e) => {
    e.preventDefault()
    createComponentMutation.mutate(componentForm)
  }

  const addComponentToStructure = (component, type) => {
    const newItem = {
      component: component._id,
      calculationType: 'use_default',
      value: component.defaultValue,
      isEnabled: true
    }
    
    if (type === 'earning') {
      setStructureForm(prev => ({
        ...prev,
        earnings: [...prev.earnings, newItem]
      }))
    } else {
      setStructureForm(prev => ({
        ...prev,
        deductions: [...prev.deductions, newItem]
      }))
    }
  }

  const removeComponentFromStructure = (index, type) => {
    if (type === 'earning') {
      setStructureForm(prev => ({
        ...prev,
        earnings: prev.earnings.filter((_, i) => i !== index)
      }))
    } else {
      setStructureForm(prev => ({
        ...prev,
        deductions: prev.deductions.filter((_, i) => i !== index)
      }))
    }
  }

  const updateStructureComponent = (index, field, value, type) => {
    if (type === 'earning') {
      setStructureForm(prev => ({
        ...prev,
        earnings: prev.earnings.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }))
    } else {
      setStructureForm(prev => ({
        ...prev,
        deductions: prev.deductions.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }))
    }
  }

  const getComponentById = (id) => components.find(c => c._id === id)

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Salary Structures</h1>
          <p className="text-gray-600 mt-1">Define and manage salary components and structures</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setActiveTab(activeTab === 'structures' ? 'components' : 'structures')}>
            <Settings className="h-4 w-4 mr-2" />
            {activeTab === 'structures' ? 'Manage Components' : 'View Structures'}
          </Button>
          {activeTab === 'structures' ? (
            <Button onClick={() => { resetStructureForm(); setSelectedStructure(null); setShowStructureModal(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              New Structure
            </Button>
          ) : (
            <Button onClick={() => { resetComponentForm(); setShowComponentModal(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              New Component
            </Button>
          )}
        </div>
      </div>

      {/* Statutory Info Banner */}
      {statutoryConfig && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">Statutory Compliance</h3>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-blue-800">
                <div>
                  <span className="font-medium">PF:</span> {statutoryConfig.pf.employeeRate}% employee, {statutoryConfig.pf.employerRate}% employer
                  <br />
                  <span className="text-xs text-blue-600">Basic wage cap: ₹{statutoryConfig.pf.basicWageCap.toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">ESI:</span> {statutoryConfig.esi.employeeRate}% employee, {statutoryConfig.esi.employerRate}% employer
                  <br />
                  <span className="text-xs text-blue-600">Gross cap: ₹{statutoryConfig.esi.grossCap.toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">PT:</span> As per state slabs
                  <br />
                  <span className="text-xs text-blue-600">Max: ₹200/month (Maharashtra)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Content */}
      {activeTab === 'structures' ? (
        /* Salary Structures List */
        <div className="space-y-4">
          {structuresLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : structures.length === 0 ? (
            <div className="card text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Salary Structures</h3>
              <p className="text-gray-500 mt-1">Create your first salary structure to get started</p>
              <Button className="mt-4" onClick={() => setShowStructureModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Structure
              </Button>
            </div>
          ) : (
            structures.map((structure) => (
              <div key={structure._id} className="card">
                {/* Structure Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setExpandedStructure(expandedStructure === structure._id ? null : structure._id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedStructure === structure._id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{structure.name}</h3>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{structure.code}</span>
                        <span className="text-xs px-2 py-0.5 bg-primary-100 rounded text-primary-700 capitalize">{structure.category}</span>
                        {structure.version > 1 && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 rounded text-purple-700">v{structure.version}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{structure.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreviewStructure(structure)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Preview Calculation"
                    >
                      <Calculator className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEditStructure(structure)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleCloneStructure(structure)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                      title="Clone"
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStructure(structure)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Statutory Badges */}
                <div className="flex gap-2 mt-3">
                  <span className={`text-xs px-2 py-1 rounded ${structure.pfApplicable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    PF {structure.pfApplicable ? '✓' : '✗'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${structure.esiApplicable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    ESI {structure.esiApplicable ? '✓' : '✗'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${structure.ptApplicable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    PT {structure.ptApplicable ? '✓' : '✗'}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${structure.tdsApplicable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    TDS {structure.tdsApplicable ? '✓' : '✗'}
                  </span>
                </div>

                {/* Expanded Details */}
                {expandedStructure === structure._id && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Earnings */}
                    <div>
                      <h4 className="font-medium text-green-700 mb-2">Earnings ({structure.earnings?.length || 0})</h4>
                      <div className="space-y-2">
                        {structure.earnings?.filter(e => e.isEnabled !== false).map((earning, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm bg-green-50 p-2 rounded">
                            <span>{earning.component?.name || 'Unknown'}</span>
                            <span className="text-gray-600">
                              {earning.calculationType === 'use_default' ? 'Default' :
                               earning.calculationType === 'fixed' ? `₹${earning.value}` :
                               earning.calculationType === 'percentage_of_basic' ? `${earning.value}% of Basic` :
                               earning.calculationType === 'percentage_of_ctc' ? `${earning.value}% of CTC` :
                               earning.formula || 'Formula'}
                            </span>
                          </div>
                        ))}
                        {(!structure.earnings || structure.earnings.length === 0) && (
                          <p className="text-sm text-gray-400">No earnings configured</p>
                        )}
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <h4 className="font-medium text-red-700 mb-2">Deductions ({structure.deductions?.length || 0})</h4>
                      <div className="space-y-2">
                        {structure.deductions?.filter(d => d.isEnabled !== false).map((deduction, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm bg-red-50 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span>{deduction.component?.name || 'Unknown'}</span>
                              {deduction.component?.isStatutory && (
                                <Shield className="h-3 w-3 text-blue-500" />
                              )}
                            </div>
                            <span className="text-gray-600">
                              {deduction.calculationType === 'use_default' ? 'Default' :
                               deduction.calculationType === 'fixed' ? `₹${deduction.value}` :
                               deduction.calculationType === 'percentage_of_basic' ? `${deduction.value}% of Basic` :
                               deduction.calculationType === 'percentage_of_ctc' ? `${deduction.value}% of CTC` :
                               deduction.formula || 'Formula'}
                            </span>
                          </div>
                        ))}
                        {(!structure.deductions || structure.deductions.length === 0) && (
                          <p className="text-sm text-gray-400">No deductions configured</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Salary Components List */
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Salary Components</h2>
            {components.length === 0 && (
              <Button variant="secondary" onClick={() => seedComponentsMutation.mutate()} isLoading={seedComponentsMutation.isLoading}>
                Seed Default Components
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Earnings */}
            <div>
              <h3 className="font-medium text-green-700 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Earnings ({groupedComponents.earnings?.length || 0})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {groupedComponents.earnings?.map((comp) => (
                  <div key={comp._id} className={`p-3 rounded-lg border ${comp.isActive ? 'bg-green-50 border-green-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comp.name}</span>
                          <span className="text-xs bg-white px-1.5 py-0.5 rounded border">{comp.code}</span>
                          {comp.isMandatory && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Required</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {comp.calculationType === 'fixed' ? 'Fixed' : 
                           comp.calculationType === 'percentage_of_basic' ? '% of Basic' :
                           comp.calculationType === 'percentage_of_ctc' ? '% of CTC' : 'Formula'} 
                          {comp.defaultValue > 0 && ` • Default: ${comp.calculationType === 'fixed' ? '₹' : ''}${comp.defaultValue}${comp.calculationType !== 'fixed' ? '%' : ''}`}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            comp.taxability === 'exempt' ? 'bg-green-100 text-green-700' :
                            comp.taxability === 'partially_taxable' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {comp.taxability?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h3 className="font-medium text-red-700 mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Deductions ({groupedComponents.deductions?.length || 0})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {groupedComponents.deductions?.map((comp) => (
                  <div key={comp._id} className={`p-3 rounded-lg border ${comp.isActive ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200 opacity-60'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{comp.name}</span>
                          <span className="text-xs bg-white px-1.5 py-0.5 rounded border">{comp.code}</span>
                          {comp.isStatutory && <Shield className="h-3 w-3 text-blue-500" title="Statutory" />}
                          {comp.isMandatory && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Required</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {comp.isStatutory ? comp.statutoryType?.replace('_', ' ').toUpperCase() : 
                           comp.calculationType === 'fixed' ? 'Fixed' : 
                           comp.calculationType === 'percentage_of_basic' ? '% of Basic' : 'Formula'}
                          {!comp.isStatutory && comp.defaultValue > 0 && ` • Default: ${comp.calculationType === 'fixed' ? '₹' : ''}${comp.defaultValue}${comp.calculationType !== 'fixed' ? '%' : ''}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Structure Modal */}
      <Modal
        isOpen={showStructureModal}
        onClose={() => { setShowStructureModal(false); setSelectedStructure(null); resetStructureForm() }}
        title={selectedStructure ? 'Edit Salary Structure' : 'Create Salary Structure'}
        size="xl"
      >
        <form onSubmit={handleStructureSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Structure Name"
              value={structureForm.name}
              onChange={(e) => setStructureForm(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="e.g., Staff Salary"
            />
            <Input
              label="Code"
              value={structureForm.code}
              onChange={(e) => setStructureForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              required
              placeholder="e.g., STAFF_SAL"
            />
            <Select
              label="Category"
              value={structureForm.category}
              onChange={(e) => setStructureForm(prev => ({ ...prev, category: e.target.value }))}
              options={CATEGORY_OPTIONS}
            />
          </div>

          <Input
            label="Description"
            value={structureForm.description}
            onChange={(e) => setStructureForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of this salary structure"
          />

          {/* Statutory Applicability */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">Statutory Applicability</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={structureForm.pfApplicable}
                  onChange={(e) => setStructureForm(prev => ({ ...prev, pfApplicable: e.target.checked }))}
                  className="rounded"
                />
                <span>PF Applicable</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={structureForm.esiApplicable}
                  onChange={(e) => setStructureForm(prev => ({ ...prev, esiApplicable: e.target.checked }))}
                  className="rounded"
                />
                <span>ESI Applicable</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={structureForm.ptApplicable}
                  onChange={(e) => setStructureForm(prev => ({ ...prev, ptApplicable: e.target.checked }))}
                  className="rounded"
                />
                <span>PT Applicable</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={structureForm.tdsApplicable}
                  onChange={(e) => setStructureForm(prev => ({ ...prev, tdsApplicable: e.target.checked }))}
                  className="rounded"
                />
                <span>TDS Applicable</span>
              </label>
            </div>
          </div>

          {/* Components Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-green-700 mb-3">Earnings</h4>
              
              {/* Selected Earnings */}
              <div className="space-y-2 mb-4">
                {structureForm.earnings.map((item, idx) => {
                  const comp = getComponentById(item.component)
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-green-50 p-2 rounded">
                      <span className="flex-1 text-sm font-medium">{comp?.name || 'Unknown'}</span>
                      <Select
                        value={item.calculationType}
                        onChange={(e) => updateStructureComponent(idx, 'calculationType', e.target.value, 'earning')}
                        options={CALC_TYPE_OPTIONS}
                        className="w-32 text-xs"
                      />
                      {item.calculationType !== 'use_default' && item.calculationType !== 'formula' && (
                        <Input
                          type="number"
                          value={item.value}
                          onChange={(e) => updateStructureComponent(idx, 'value', parseFloat(e.target.value) || 0, 'earning')}
                          className="w-20 text-xs"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeComponentFromStructure(idx, 'earning')}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add Earning */}
              <Select
                placeholder="+ Add Earning Component"
                value=""
                onChange={(e) => {
                  const comp = components.find(c => c._id === e.target.value)
                  if (comp) addComponentToStructure(comp, 'earning')
                }}
                options={groupedComponents.earnings
                  ?.filter(c => !structureForm.earnings.some(e => e.component === c._id))
                  .map(c => ({ value: c._id, label: c.name }))}
              />
            </div>

            {/* Deductions */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-red-700 mb-3">Deductions</h4>
              
              {/* Selected Deductions */}
              <div className="space-y-2 mb-4">
                {structureForm.deductions.map((item, idx) => {
                  const comp = getComponentById(item.component)
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-red-50 p-2 rounded">
                      <span className="flex-1 text-sm font-medium">{comp?.name || 'Unknown'}</span>
                      <Select
                        value={item.calculationType}
                        onChange={(e) => updateStructureComponent(idx, 'calculationType', e.target.value, 'deduction')}
                        options={CALC_TYPE_OPTIONS}
                        className="w-32 text-xs"
                      />
                      {item.calculationType !== 'use_default' && item.calculationType !== 'formula' && (
                        <Input
                          type="number"
                          value={item.value}
                          onChange={(e) => updateStructureComponent(idx, 'value', parseFloat(e.target.value) || 0, 'deduction')}
                          className="w-20 text-xs"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeComponentFromStructure(idx, 'deduction')}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Add Deduction */}
              <Select
                placeholder="+ Add Deduction Component"
                value=""
                onChange={(e) => {
                  const comp = components.find(c => c._id === e.target.value)
                  if (comp) addComponentToStructure(comp, 'deduction')
                }}
                options={groupedComponents.deductions
                  ?.filter(c => !structureForm.deductions.some(d => d.component === c._id))
                  .map(c => ({ value: c._id, label: c.name }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setShowStructureModal(false); setSelectedStructure(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createStructureMutation.isLoading || updateStructureMutation.isLoading}>
              {selectedStructure ? 'Update Structure' : 'Create Structure'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Clone Modal */}
      <Modal
        isOpen={showCloneModal}
        onClose={() => { setShowCloneModal(false); setSelectedStructure(null) }}
        title="Clone Salary Structure"
      >
        <form onSubmit={handleCloneSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            Cloning: <strong>{selectedStructure?.name}</strong>
          </p>
          <Input
            label="New Name"
            value={cloneForm.name}
            onChange={(e) => setCloneForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          <Input
            label="New Code"
            value={cloneForm.code}
            onChange={(e) => setCloneForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
            required
          />
          <Input
            label="Description"
            value={cloneForm.description}
            onChange={(e) => setCloneForm(prev => ({ ...prev, description: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCloneModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={cloneStructureMutation.isLoading}>
              Clone Structure
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => { setShowPreviewModal(false); setSelectedStructure(null) }}
        title="Salary Preview"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              label="Annual CTC"
              type="number"
              value={previewCtc}
              onChange={(e) => setPreviewCtc(parseInt(e.target.value) || 0)}
              className="w-48"
            />
            <Button type="button" onClick={() => refetchPreview()} className="mt-6">
              Calculate
            </Button>
          </div>

          {previewData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-blue-600">Annual CTC</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(previewData.ctc)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-green-600">Gross (Monthly)</p>
                  <p className="text-lg font-bold text-green-900">{formatCurrency(previewData.grossSalary)}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-red-600">Deductions</p>
                  <p className="text-lg font-bold text-red-900">{formatCurrency(previewData.totalDeductions)}</p>
                </div>
                <div className="bg-primary-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-primary-600">Net (Monthly)</p>
                  <p className="text-lg font-bold text-primary-900">{formatCurrency(previewData.netSalary)}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-green-700 mb-2">Earnings</h4>
                  <div className="space-y-1">
                    {previewData.earnings?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-green-50 p-2 rounded">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Earnings</span>
                      <span className="text-green-700">{formatCurrency(previewData.totalEarnings)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-red-700 mb-2">Deductions</h4>
                  <div className="space-y-1">
                    {previewData.deductions?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-red-50 p-2 rounded">
                        <span>{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Total Deductions</span>
                      <span className="text-red-700">{formatCurrency(previewData.totalDeductions)}</span>
                    </div>
                  </div>
                  {previewData.employerContributions > 0 && (
                    <div className="mt-3 text-sm text-gray-500">
                      Employer Contributions: {formatCurrency(previewData.employerContributions)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Component Modal */}
      <Modal
        isOpen={showComponentModal}
        onClose={() => { setShowComponentModal(false); resetComponentForm() }}
        title="Create Salary Component"
        size="lg"
      >
        <form onSubmit={handleComponentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Component Name"
              value={componentForm.name}
              onChange={(e) => setComponentForm(prev => ({ ...prev, name: e.target.value }))}
              required
              placeholder="e.g., Special Allowance"
            />
            <Input
              label="Code"
              value={componentForm.code}
              onChange={(e) => setComponentForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              required
              placeholder="e.g., SPECIAL_ALW"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Type"
              value={componentForm.type}
              onChange={(e) => setComponentForm(prev => ({ ...prev, type: e.target.value }))}
              options={[
                { value: 'earning', label: 'Earning' },
                { value: 'deduction', label: 'Deduction' }
              ]}
            />
            <Select
              label="Calculation Type"
              value={componentForm.calculationType}
              onChange={(e) => setComponentForm(prev => ({ ...prev, calculationType: e.target.value }))}
              options={[
                { value: 'fixed', label: 'Fixed Amount' },
                { value: 'percentage_of_basic', label: '% of Basic' },
                { value: 'percentage_of_ctc', label: '% of CTC' },
                { value: 'formula', label: 'Formula' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Default Value"
              type="number"
              value={componentForm.defaultValue}
              onChange={(e) => setComponentForm(prev => ({ ...prev, defaultValue: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Taxability"
              value={componentForm.taxability}
              onChange={(e) => setComponentForm(prev => ({ ...prev, taxability: e.target.value }))}
              options={[
                { value: 'taxable', label: 'Taxable' },
                { value: 'partially_taxable', label: 'Partially Taxable' },
                { value: 'exempt', label: 'Exempt' }
              ]}
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={componentForm.isMandatory}
                onChange={(e) => setComponentForm(prev => ({ ...prev, isMandatory: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Mandatory</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={componentForm.showInPayslip}
                onChange={(e) => setComponentForm(prev => ({ ...prev, showInPayslip: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm">Show in Payslip</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setShowComponentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createComponentMutation.isLoading}>
              Create Component
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default SalaryStructures

