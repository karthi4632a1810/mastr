import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'

const EmployeeForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const isEdit = !!id
  const DEFAULT_PASSWORD = 'Temp@123'

  const [userRole, setUserRole] = useState('employee')
  const [passwordOption, setPasswordOption] = useState('random')
  const [customPassword, setCustomPassword] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')

  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const response = await api.get(`/employees/${id}`)
      return response.data.data
    },
    enabled: isEdit,
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data.data
    },
  })

  const { data: designations } = useQuery({
    queryKey: ['designations'],
    queryFn: async () => {
      const response = await api.get('/designations')
      return response.data.data
    },
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.get('/settings/branches')
      return response.data.data
    },
  })

  const roleOptions = useMemo(() => {
    const base = [
      { value: 'employee', label: 'Employee' },
      { value: 'hr', label: 'HR' }
    ]

    if (user?.role === 'admin') {
      base.unshift({ value: 'admin', label: 'Admin' })
    }

    return base
  }, [user])

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@$%&*?'
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const { data: shifts } = useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await api.get('/shifts')
      return response.data.data
    },
  })

  const { data: employees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: async () => {
      const response = await api.get('/employees', { params: { limit: 1000 } })
      return response.data.data || []
    },
  })

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    bloodGroup: '',
    maritalStatus: '',
    nationality: 'Indian',
    panNumber: '',
    aadhaarNumber: '',
    passportNumber: '',
    // Contact Information
    alternatePhone: '',
    alternateEmail: '',
    linkedInProfile: '',
    skypeId: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    emergencyContact: {
      name: '',
      relation: '',
      phone: '',
      address: ''
    },
    // Job Details
    department: '',
    designation: '',
    // Joining Details
    joiningDate: '',
    employeeType: 'full_time',
    employmentType: 'permanent',
    probationPeriodEndDate: '',
    confirmationDate: '',
    reportingManager: '',
    workLocation: '',
    employeeCategory: '',
    grade: '',
    costCenter: '',
    // Organization Details
    branch: '',
    shift: '',
    salary: 0,
    status: 'active',
    // Financial Information
    bankDetails: {
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      branchName: '',
      accountHolderName: ''
    },
    // Statutory Details
    statutoryDetails: {
      uan: '',
      esiNumber: '',
      pfNumber: ''
    },
    // Skills & Qualifications
    education: [],
    skills: [],
    certifications: [],
    languages: []
  })

  const [errors, setErrors] = useState({})
  const [createdEmployeeCode, setCreatedEmployeeCode] = useState(null)

  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
        gender: employee.gender || 'male',
        bloodGroup: employee.bloodGroup || '',
        maritalStatus: employee.maritalStatus || '',
        nationality: employee.nationality || 'Indian',
        panNumber: employee.panNumber || '',
        aadhaarNumber: employee.aadhaarNumber || '',
        passportNumber: employee.passportNumber || '',
        alternatePhone: employee.alternatePhone || '',
        alternateEmail: employee.alternateEmail || '',
        linkedInProfile: employee.linkedInProfile || '',
        skypeId: employee.skypeId || '',
        address: {
          street: employee.address?.street || '',
          city: employee.address?.city || '',
          state: employee.address?.state || '',
          zipCode: employee.address?.zipCode || '',
          country: employee.address?.country || 'India'
        },
        emergencyContact: {
          name: employee.emergencyContact?.name || '',
          relation: employee.emergencyContact?.relation || '',
          phone: employee.emergencyContact?.phone || '',
          address: employee.emergencyContact?.address || ''
        },
        department: employee.department?._id || '',
        designation: employee.designation?._id || '',
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '',
        employeeType: employee.employeeType || 'full_time',
        employmentType: employee.employmentType || 'permanent',
        probationPeriodEndDate: employee.probationPeriodEndDate ? new Date(employee.probationPeriodEndDate).toISOString().split('T')[0] : '',
        confirmationDate: employee.confirmationDate ? new Date(employee.confirmationDate).toISOString().split('T')[0] : '',
        reportingManager: employee.reportingManager?._id || '',
        workLocation: employee.workLocation || '',
        employeeCategory: employee.employeeCategory || '',
        grade: employee.grade || '',
        costCenter: employee.costCenter || '',
        branch: employee.branch?._id || '',
        shift: employee.shift?._id || '',
        salary: employee.salary || 0,
        status: employee.status || 'active',
        bankDetails: {
          accountNumber: employee.bankDetails?.accountNumber || '',
          bankName: employee.bankDetails?.bankName || '',
          ifscCode: employee.bankDetails?.ifscCode || '',
          branchName: employee.bankDetails?.branchName || '',
          accountHolderName: employee.bankDetails?.accountHolderName || ''
        },
        statutoryDetails: {
          uan: employee.statutoryDetails?.uan || '',
          esiNumber: employee.statutoryDetails?.esiNumber || '',
          pfNumber: employee.statutoryDetails?.pfNumber || ''
        },
        education: employee.education || [],
        skills: employee.skills || [],
        certifications: employee.certifications || [],
        languages: employee.languages || []
      })
    }
  }, [employee])

  const validateForm = () => {
    const newErrors = {}
    
    // Personal Information Validation - Mandatory fields cannot be empty
    if (!formData.firstName || !formData.firstName.trim()) {
      newErrors.firstName = 'First name is required and cannot be empty'
    }
    if (!formData.lastName || !formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required and cannot be empty'
    }
    if (!formData.email || !formData.email.trim()) {
      newErrors.email = 'Email is required and cannot be empty'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!formData.phone || !formData.phone.trim()) {
      newErrors.phone = 'Phone number is required and cannot be empty'
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required and cannot be empty'
    }
    if (!formData.gender) {
      newErrors.gender = 'Gender is required'
    } else if (!['male', 'female', 'other'].includes(formData.gender)) {
      newErrors.gender = 'Gender must be male, female, or other'
    }
    
    // Job Details Validation - Mandatory fields cannot be empty
    if (!formData.department) {
      newErrors.department = 'Department is required and cannot be empty'
    }
    if (!formData.designation) {
      newErrors.designation = 'Designation is required and cannot be empty'
    }
    
    // Joining Details Validation - Mandatory fields cannot be empty
    if (!formData.joiningDate) {
      newErrors.joiningDate = 'Joining date is required and cannot be empty'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const mutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        return api.put(`/employees/${id}`, data)
      } else {
        return api.post('/employees', { ...data, createUserAccount: true })
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries(['employees'])
      if (!isEdit && response.data.data?.employeeId) {
        setCreatedEmployeeCode(response.data.data.employeeId)
        showToast(`Employee created successfully! Employee Code: ${response.data.data.employeeId}`, 'success')
        // Wait 2 seconds before navigating to show the employee code
        setTimeout(() => {
          navigate('/employees')
        }, 2000)
      } else {
        let message = 'Employee updated successfully'
        if (response.data.changes && response.data.changes.length > 0) {
          message += `. Changes: ${response.data.changes.join(', ')}`
        }
        showToast(message, 'success')
        navigate('/employees')
      }
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Operation failed'
      showToast(errorMessage, 'error')
      if (error.response?.data?.errors) {
        const validationErrors = {}
        error.response.data.errors.forEach(err => {
          // express-validator uses 'param' not 'path'
          const fieldName = err.param || err.path
          validationErrors[fieldName] = err.msg
        })
        setErrors(validationErrors)
      }
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrors({})
    
    if (!validateForm()) {
      showToast('Please fill in all required fields', 'error')
      return
    }
    
    // Clean up form data before sending - convert empty strings to null for optional enum fields
    const cleanedData = { ...formData }
    
    // Convert empty strings to null for optional enum fields
    const optionalEnumFields = ['bloodGroup', 'maritalStatus', 'employeeCategory']
    optionalEnumFields.forEach(field => {
      if (cleanedData[field] === '') {
        cleanedData[field] = null
      }
    })
    
    // Convert empty strings to null for optional ObjectId fields
    const optionalObjectIdFields = ['branch', 'shift', 'reportingManager']
    optionalObjectIdFields.forEach(field => {
      if (cleanedData[field] === '') {
        cleanedData[field] = null
      }
    })
    
    // Convert date strings to ISO8601 format for required dates
    const requiredDateFields = ['dateOfBirth', 'joiningDate']
    requiredDateFields.forEach(field => {
      if (cleanedData[field]) {
        // Convert YYYY-MM-DD to ISO8601 format
        const date = new Date(cleanedData[field])
        if (!isNaN(date.getTime())) {
          cleanedData[field] = date.toISOString()
        }
      }
    })
    
    // Convert empty strings to null for optional date fields, or convert to ISO8601 if provided
    const optionalDateFields = ['probationPeriodEndDate', 'confirmationDate', 'noticePeriodEndDate']
    optionalDateFields.forEach(field => {
      if (cleanedData[field] === '') {
        cleanedData[field] = null
      } else if (cleanedData[field]) {
        // Convert YYYY-MM-DD to ISO8601 format
        const date = new Date(cleanedData[field])
        if (!isNaN(date.getTime())) {
          cleanedData[field] = date.toISOString()
        }
      }
    })
    
    // Handle salary field - convert empty string to null, keep 0 as 0
    if (cleanedData.salary === '' || cleanedData.salary === null || cleanedData.salary === undefined) {
      cleanedData.salary = null
    } else {
      cleanedData.salary = Number(cleanedData.salary)
    }
    
    // Clean up empty nested objects - remove address if all fields are empty
    if (cleanedData.address) {
      const hasAddressData = Object.values(cleanedData.address).some(val => val && val.trim && val.trim() !== '')
      if (!hasAddressData) {
        delete cleanedData.address
      } else {
        // Clean empty strings in address fields
        Object.keys(cleanedData.address).forEach(key => {
          if (cleanedData.address[key] === '') {
            delete cleanedData.address[key]
          }
        })
      }
    }
    
    // Clean up empty emergencyContact object
    if (cleanedData.emergencyContact) {
      const hasEmergencyData = Object.values(cleanedData.emergencyContact).some(val => val && val.trim && val.trim() !== '')
      if (!hasEmergencyData) {
        delete cleanedData.emergencyContact
      } else {
        // Clean empty strings in emergencyContact fields
        Object.keys(cleanedData.emergencyContact).forEach(key => {
          if (cleanedData.emergencyContact[key] === '') {
            delete cleanedData.emergencyContact[key]
          }
        })
      }
    }
    
    // Include account setup fields only on create
    let payload = { ...cleanedData }
    if (!isEdit) {
      let passwordForUser = ''

      if (passwordOption === 'custom') {
        if (!customPassword) {
          showToast('Please provide a password', 'error')
          return
        }
        passwordForUser = customPassword
      } else if (passwordOption === 'default') {
        passwordForUser = DEFAULT_PASSWORD
      } else {
        passwordForUser = generateRandomPassword()
        setGeneratedPassword(passwordForUser)
      }

      payload = {
        ...payload,
        role: userRole,
        passwordOption,
        password: passwordForUser
      }
    }

    mutation.mutate(payload)
  }

  const updateNestedField = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  if (isEdit && employeeLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            {isEdit ? 'Edit Employee' : 'Add Employee'}
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            {isEdit ? 'Update employee information' : 'Add a new employee to the system'}
          </p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => navigate('/employees')}
          className="hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow"
        >
          Cancel
        </Button>
      </div>

      {createdEmployeeCode && (
        <div className="mb-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg shadow-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">✓</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-green-800 font-semibold text-base">
                Employee created successfully!
              </p>
              <p className="text-green-700 text-sm mt-1">
                Employee Code: <span className="font-bold text-lg">{createdEmployeeCode}</span>
              </p>
              <p className="text-green-600 text-xs mt-2">Redirecting to employee list...</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-8 shadow-lg border-t-4 border-t-primary-500">
        {/* Personal Information Section */}
        <div>
          <div className="border-b-2 border-primary-200 pb-4 mb-6 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded-t-lg">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-1 bg-primary-500 rounded-full"></div>
              Personal Information
            </h2>
            <p className="text-sm text-gray-600 mt-1 ml-3">Basic personal details of the employee</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Input
                label="First Name"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                error={errors.firstName}
              />
            </div>
            <div>
              <Input
                label="Last Name"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                error={errors.lastName}
              />
            </div>
            <div>
              <Input
                label="Email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
              />
            </div>
            <div>
              <Input
                label="Phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                error={errors.phone}
              />
            </div>
            <div>
              <Input
                label="Date of Birth"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                error={errors.dateOfBirth}
              />
            </div>
            <div>
              <Select
                label="Gender"
                required
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Blood Group"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                options={[
                  { value: '', label: 'Select Blood Group' },
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' },
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Marital Status"
                value={formData.maritalStatus}
                onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                options={[
                  { value: '', label: 'Select Marital Status' },
                  { value: 'single', label: 'Single' },
                  { value: 'married', label: 'Married' },
                  { value: 'divorced', label: 'Divorced' },
                  { value: 'widowed', label: 'Widowed' }
                ]}
              />
            </div>
            <div>
              <Input
                label="Nationality"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="PAN Number"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </div>
            <div>
              <Input
                label="Aadhaar Number"
                type="text"
                value={formData.aadhaarNumber}
                onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                placeholder="12 digit number"
                maxLength={12}
              />
            </div>
            <div>
              <Input
                label="Passport Number"
                value={formData.passportNumber}
                onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div>
          <div className="border-b-2 border-primary-200 pb-4 mb-6 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded-t-lg">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-1 bg-primary-500 rounded-full"></div>
              Contact Information
            </h2>
            <p className="text-sm text-gray-600 mt-1 ml-3">Address, alternate contacts, and emergency contact details</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Input
                label="Alternate Phone"
                type="tel"
                value={formData.alternatePhone}
                onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Alternate Email"
                type="email"
                value={formData.alternateEmail}
                onChange={(e) => setFormData({ ...formData, alternateEmail: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="LinkedIn Profile"
                type="url"
                value={formData.linkedInProfile}
                onChange={(e) => setFormData({ ...formData, linkedInProfile: e.target.value })}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <Input
                label="Skype ID"
                value={formData.skypeId}
                onChange={(e) => setFormData({ ...formData, skypeId: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Address</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Street Address"
                value={formData.address.street}
                onChange={(e) => updateNestedField('address', 'street', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="City"
                value={formData.address.city}
                onChange={(e) => updateNestedField('address', 'city', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="State"
                value={formData.address.state}
                onChange={(e) => updateNestedField('address', 'state', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Zip Code"
                value={formData.address.zipCode}
                onChange={(e) => updateNestedField('address', 'zipCode', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Country"
                value={formData.address.country}
                onChange={(e) => updateNestedField('address', 'country', e.target.value)}
              />
            </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <Input
                  label="Contact Name"
                  value={formData.emergencyContact.name}
                  onChange={(e) => updateNestedField('emergencyContact', 'name', e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Relation"
                  value={formData.emergencyContact.relation}
                  onChange={(e) => updateNestedField('emergencyContact', 'relation', e.target.value)}
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>
              <div>
                <Input
                  label="Contact Phone"
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => updateNestedField('emergencyContact', 'phone', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Emergency Contact Address"
                  value={formData.emergencyContact.address}
                  onChange={(e) => updateNestedField('emergencyContact', 'address', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {!isEdit && (
          <div className="mt-8">
            <div className="border-b-2 border-primary-200 pb-4 mb-6 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded-t-lg">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="h-8 w-1 bg-primary-500 rounded-full"></div>
                Account & Access
              </h2>
              <p className="text-sm text-gray-600 mt-1 ml-3">Choose the user role and password policy for the new account</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Select
                label="User Role"
                required
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                options={roleOptions}
                placeholder="Select role"
              />

              <Select
                label="Password Option"
                required
                value={passwordOption}
                onChange={(e) => {
                  setPasswordOption(e.target.value)
                  if (e.target.value !== 'custom') {
                    setCustomPassword('')
                  }
                }}
                options={[
                  { value: 'random', label: 'Generate random password' },
                  { value: 'default', label: `Use default password (${DEFAULT_PASSWORD})` },
                  { value: 'custom', label: 'Set a specific password' }
                ]}
              />
            </div>

            {passwordOption === 'custom' && (
              <div className="mt-4 max-w-xl">
                <Input
                  label="Custom Password"
                  type="password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  required={passwordOption === 'custom'}
                  placeholder="Enter the password to assign"
                />
              </div>
            )}

            {passwordOption === 'random' && generatedPassword && (
              <div className="mt-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 max-w-xl">
                Generated password: <span className="font-mono">{generatedPassword}</span>
              </div>
            )}
          </div>
        )}

        {/* Job Details Section */}
        <div>
          <div className="border-b-2 border-primary-200 pb-4 mb-6 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded-t-lg">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-1 bg-primary-500 rounded-full"></div>
              Job Details
            </h2>
            <p className="text-sm text-gray-600 mt-1 ml-3">Employment role and position information</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Select
                label="Department"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                options={departments?.map(dept => ({ value: dept._id, label: dept.name })) || []}
                placeholder="Select Department"
                error={errors.department}
              />
            </div>
            <div>
              <Select
                label="Designation"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                options={designations?.map(desg => ({ value: desg._id, label: desg.name })) || []}
                placeholder="Select Designation"
                error={errors.designation}
              />
            </div>
          </div>
        </div>

        {/* Joining Details Section */}
        <div>
          <div className="border-b-2 border-primary-200 pb-4 mb-6 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded-t-lg">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-1 bg-primary-500 rounded-full"></div>
              Joining Details
            </h2>
            <p className="text-sm text-gray-600 mt-1 ml-3">Employee joining and employment information</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Input
                label="Joining Date"
                type="date"
                required
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                error={errors.joiningDate}
              />
            </div>
            <div>
              <Select
                label="Employee Type"
                value={formData.employeeType}
                onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                options={[
                  { value: 'full_time', label: 'Full Time' },
                  { value: 'part_time', label: 'Part Time' },
                  { value: 'contract', label: 'Contract' },
                  { value: 'intern', label: 'Intern' },
                  { value: 'consultant', label: 'Consultant' }
                ]}
              />
            </div>
            <div>
              <Select
                label="Employment Type"
                value={formData.employmentType}
                onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                options={[
                  { value: 'permanent', label: 'Permanent' },
                  { value: 'temporary', label: 'Temporary' },
                  { value: 'contractual', label: 'Contractual' }
                ]}
              />
            </div>
            <div>
              <Input
                label="Probation Period End Date"
                type="date"
                value={formData.probationPeriodEndDate}
                onChange={(e) => setFormData({ ...formData, probationPeriodEndDate: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Confirmation Date"
                type="date"
                value={formData.confirmationDate}
                onChange={(e) => setFormData({ ...formData, confirmationDate: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Reporting Manager"
                value={formData.reportingManager}
                onChange={(e) => setFormData({ ...formData, reportingManager: e.target.value })}
                options={[
                  { value: '', label: 'Select Reporting Manager' },
                  ...(employees?.filter(emp => !isEdit || emp._id !== id).map(emp => ({
                    value: emp._id,
                    label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
                  })) || [])
                ]}
              />
            </div>
            <div>
              <Input
                label="Work Location"
                value={formData.workLocation}
                onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Employee Category"
                value={formData.employeeCategory}
                onChange={(e) => setFormData({ ...formData, employeeCategory: e.target.value })}
                options={[
                  { value: '', label: 'Select Category' },
                  { value: 'executive', label: 'Executive' },
                  { value: 'manager', label: 'Manager' },
                  { value: 'senior', label: 'Senior' },
                  { value: 'junior', label: 'Junior' },
                  { value: 'trainee', label: 'Trainee' }
                ]}
              />
            </div>
            <div>
              <Input
                label="Grade"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>
            <div>
              <Input
                label="Cost Center"
                value={formData.costCenter}
                onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Organization Details Section */}
        <div>
          <div className="border-b-2 border-primary-200 pb-4 mb-6 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded-t-lg">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-1 bg-primary-500 rounded-full"></div>
              Organization Details
            </h2>
            <p className="text-sm text-gray-600 mt-1 ml-3">Branch, shift, salary, and employment status</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Select
                label="Branch"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                options={branches?.map(branch => ({ value: branch._id, label: branch.name })) || []}
                placeholder="Select Branch"
              />
            </div>
            <div>
              <Select
                label="Shift"
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                options={shifts?.map(shift => ({ value: shift._id, label: shift.name })) || []}
                placeholder="Select Shift"
              />
            </div>
            <div>
              <Input
                label="Salary"
                type="number"
                min="0"
                step="0.01"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>
            <div>
              <Select
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'notice_period', label: 'Notice Period' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Financial Information Section */}
        <div>
          <div className="border-b-2 border-primary-200 pb-4 mb-6 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded-t-lg">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-1 bg-primary-500 rounded-full"></div>
              Financial Information
            </h2>
            <p className="text-sm text-gray-600 mt-1 ml-3">Bank account details for salary processing</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Input
                label="Account Number"
                value={formData.bankDetails.accountNumber}
                onChange={(e) => updateNestedField('bankDetails', 'accountNumber', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Bank Name"
                value={formData.bankDetails.bankName}
                onChange={(e) => updateNestedField('bankDetails', 'bankName', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="IFSC Code"
                value={formData.bankDetails.ifscCode}
                onChange={(e) => updateNestedField('bankDetails', 'ifscCode', e.target.value.toUpperCase())}
                placeholder="ABCD0123456"
                maxLength={11}
              />
            </div>
            <div>
              <Input
                label="Branch Name"
                value={formData.bankDetails.branchName}
                onChange={(e) => updateNestedField('bankDetails', 'branchName', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Account Holder Name"
                value={formData.bankDetails.accountHolderName}
                onChange={(e) => updateNestedField('bankDetails', 'accountHolderName', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Statutory Details Section */}
        <div>
          <div className="border-b-2 border-primary-200 pb-4 mb-6 bg-gradient-to-r from-primary-50 to-transparent -mx-6 px-6 py-3 rounded-t-lg">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <div className="h-8 w-1 bg-primary-500 rounded-full"></div>
              Statutory Details
            </h2>
            <p className="text-sm text-gray-600 mt-1 ml-3">PF, ESI, and other statutory information</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <Input
                label="UAN (Universal Account Number)"
                type="text"
                value={formData.statutoryDetails.uan}
                onChange={(e) => updateNestedField('statutoryDetails', 'uan', e.target.value.replace(/\D/g, '').slice(0, 12))}
                placeholder="12 digit UAN"
                maxLength={12}
              />
            </div>
            <div>
              <Input
                label="ESI Number"
                value={formData.statutoryDetails.esiNumber}
                onChange={(e) => updateNestedField('statutoryDetails', 'esiNumber', e.target.value)}
              />
            </div>
            <div>
              <Input
                label="PF Number"
                value={formData.statutoryDetails.pfNumber}
                onChange={(e) => updateNestedField('statutoryDetails', 'pfNumber', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t-2 border-gray-200 bg-gray-50 -mx-6 px-6 py-4 rounded-b-lg">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/employees')}
            className="w-full sm:w-auto hover:bg-gray-200 transition-all duration-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={mutation.isLoading}
            className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {isEdit ? 'Update Employee' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EmployeeForm
