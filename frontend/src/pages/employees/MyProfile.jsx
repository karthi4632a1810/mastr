import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useRef } from 'react'
import { User, Briefcase, Phone, FileText, History, DollarSign, CreditCard, Lock, Camera, X, UserPlus } from 'lucide-react'
import Button from '../../components/Button'
import LoadingSpinner from '../../components/LoadingSpinner'
import { format } from 'date-fns'

// Create Profile Form Component
const CreateProfileForm = ({ onCreate, user }) => {
  const [formData, setFormData] = useState({
    firstName: 'prixo', // Default name as requested
    lastName: '',
    email: user?.email || '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    joiningDate: new Date().toISOString().split('T')[0],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const submitData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : new Date().toISOString(),
        joiningDate: formData.joiningDate ? new Date(formData.joiningDate).toISOString() : new Date().toISOString(),
      }
      onCreate(submitData)
    } catch (error) {
      console.error('Error creating profile:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pb-4 sm:pb-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create Your Profile</h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
          Complete your employee profile to get started
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="flex items-center space-x-3 mb-4 sm:mb-6 pb-4 border-b">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Basic Information</h2>
              <p className="text-xs sm:text-sm text-gray-500">Fill in your personal details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dateOfBirth"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="joiningDate" className="block text-sm font-medium text-gray-700 mb-2">
                Joining Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="joiningDate"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {isSubmitting ? 'Creating...' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MyProfile = () => {
  const navigate = useNavigate()
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('personal')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(null)
  const isHRorAdmin = isHR || isAdmin

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const response = await api.get('/employees/me')
      return response.data.data
    },
    retry: false, // Don't retry on 404
  })

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/employees/me', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['myProfile'])
      showToast(data.message || 'Profile created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create profile', 'error')
    },
  })

  // Upload profile photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData()
      formData.append('photo', file)
      const response = await api.post('/employees/me/photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['myProfile'])
      setPreview(null)
      showToast(data.message || 'Profile photo uploaded successfully', 'success')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to upload profile photo', 'error')
    },
    onSettled: () => {
      setUploading(false)
    },
  })

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error')
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      showToast('Please select an image file', 'error')
      return
    }
    setUploading(true)
    uploadPhotoMutation.mutate(file)
  }

  const handleCancel = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  // Show create profile form if no profile exists (404 error)
  if (!employee && (error?.response?.status === 404 || !error)) {
    return <CreateProfileForm onCreate={createProfileMutation.mutate} user={user} />
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Profile not found</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    )
  }

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'job', label: 'Job', icon: Briefcase },
    { id: 'contact', label: 'Contact', icon: Phone },
    ...(isHRorAdmin ? [{ id: 'financial', label: 'Financial', icon: DollarSign }] : []),
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'history', label: 'History', icon: History },
  ]

  const InfoRow = ({ label, value, sensitive = false }) => (
    <div className="py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 rounded-md px-2">
      <dt className="text-sm font-semibold text-gray-600 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">
        {sensitive && !isHRorAdmin ? (
          <span className="flex items-center text-gray-400">
            <Lock className="h-3 w-3 mr-1" />
            Restricted
          </span>
        ) : (
          value || <span className="text-gray-400 italic">Not provided</span>
        )}
      </dd>
    </div>
  )

  const formatDate = (date) => {
    if (!date) return '-'
    return format(new Date(date), 'MMM dd, yyyy')
  }

  const formatDateTime = (date) => {
    if (!date) return '-'
    return format(new Date(date), 'MMM dd, yyyy HH:mm')
  }

  return (
    <div className="pb-4 sm:pb-8 space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">My Profile</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            View your personal and job details
          </p>
        </div>
      </div>

      {/* Enhanced Profile Header Card */}
      <div className="card mb-4 sm:mb-6 shadow-lg border-t-4 border-t-primary-500 hover:shadow-xl transition-shadow duration-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative flex-shrink-0">
            <div className="h-20 w-20 sm:h-24 sm:w-24 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
              {preview ? (
                <img src={preview} alt="Preview" className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover" />
              ) : employee.profilePhoto ? (
                <img 
                  src={employee.profilePhoto.startsWith('data:') ? employee.profilePhoto : employee.profilePhoto.startsWith('http') ? employee.profilePhoto : employee.profilePhoto} 
                  alt={`${employee.firstName} ${employee.lastName}`} 
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover" 
                />
              ) : (
                <User className="h-10 w-10 sm:h-12 sm:w-12 text-primary-600" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-1.5 sm:p-2 hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-lg min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center"
              title="Upload profile photo"
            >
              <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          {preview && (
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-center sm:justify-start">
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="text-sm min-h-[44px]"
              >
                {uploading ? 'Uploading...' : 'Save Photo'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={uploading}
                className="text-sm min-h-[44px]"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}
          <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 sm:space-x-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h2>
                <p className="text-gray-600 text-sm sm:text-base break-words">{employee.email}</p>
              </div>
              <div className="sm:ml-auto">
                <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-sm ${
                  employee.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200' :
                  employee.status === 'notice_period' ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200' :
                  'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
                }`}>
                  {employee.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 block text-xs mb-1">Department</span>
                <span className="font-semibold text-gray-900 text-sm">{employee.department?.name || '-'}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 block text-xs mb-1">Designation</span>
                <span className="font-semibold text-gray-900 text-sm">{employee.designation?.name || '-'}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 block text-xs mb-1">Branch</span>
                <span className="font-semibold text-gray-900 text-sm">{employee.branch?.name || '-'}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 block text-xs mb-1">Joining Date</span>
                <span className="font-semibold text-gray-900 text-sm">{formatDate(employee.joiningDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="card shadow-lg">
        <div className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-transparent overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-4 min-w-max sm:min-w-0 scrollbar-thin" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 sm:py-4 px-3 sm:px-4 border-b-2 font-semibold text-xs sm:text-sm flex items-center space-x-2 whitespace-nowrap min-h-[44px] transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 active:text-primary-600'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Personal Information Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow label="First Name" value={employee.firstName} />
                  <InfoRow label="Last Name" value={employee.lastName} />
                  <InfoRow label="Email" value={employee.email} />
                  <InfoRow label="Phone" value={employee.phone} />
                  <InfoRow label="Alternate Phone" value={employee.alternatePhone} />
                  <InfoRow label="Alternate Email" value={employee.alternateEmail} />
                  <InfoRow label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                  <InfoRow label="Gender" value={employee.gender?.charAt(0).toUpperCase() + employee.gender?.slice(1)} />
                  <InfoRow label="Blood Group" value={employee.bloodGroup} />
                  <InfoRow label="Marital Status" value={employee.maritalStatus?.charAt(0).toUpperCase() + employee.maritalStatus?.slice(1)} />
                  <InfoRow label="Nationality" value={employee.nationality} />
                  <InfoRow label="PAN Number" value={employee.panNumber} />
                  <InfoRow label="Aadhaar Number" value={employee.aadhaarNumber} />
                  <InfoRow label="Passport Number" value={employee.passportNumber} />
                </dl>
              </div>
            </div>
          )}

          {/* Job Information Tab */}
          {activeTab === 'job' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow label="Employee ID" value={employee.employeeId} />
                  <InfoRow label="Department" value={employee.department?.name} />
                  <InfoRow label="Designation" value={employee.designation?.name} />
                  <InfoRow label="Branch" value={employee.branch?.name} />
                  <InfoRow label="Shift" value={employee.shift?.name} />
                  <InfoRow label="Joining Date" value={formatDate(employee.joiningDate)} />
                  <InfoRow label="Employee Type" value={employee.employeeType?.replace('_', ' ').toUpperCase()} />
                  <InfoRow label="Employment Type" value={employee.employmentType?.charAt(0).toUpperCase() + employee.employmentType?.slice(1)} />
                  <InfoRow label="Probation End Date" value={formatDate(employee.probationPeriodEndDate)} />
                  <InfoRow label="Confirmation Date" value={formatDate(employee.confirmationDate)} />
                  <InfoRow label="Reporting Manager" value={employee.reportingManager ? `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : '-'} />
                  <InfoRow label="Work Location" value={employee.workLocation} />
                  <InfoRow label="Employee Category" value={employee.employeeCategory?.charAt(0).toUpperCase() + employee.employeeCategory?.slice(1)} />
                  <InfoRow label="Grade" value={employee.grade} sensitive={!isHRorAdmin} />
                  <InfoRow label="Cost Center" value={employee.costCenter} sensitive={!isHRorAdmin} />
                  <InfoRow label="Status" value={employee.status?.replace('_', ' ').toUpperCase()} />
                  <InfoRow label="Salary" value={employee.salary ? `₹${employee.salary.toLocaleString('en-IN')}` : '-'} sensitive={!isHRorAdmin} />
                </dl>
              </div>
            </div>
          )}

          {/* Contact Information Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow label="Street" value={employee.address?.street} />
                  <InfoRow label="City" value={employee.address?.city} />
                  <InfoRow label="State" value={employee.address?.state} />
                  <InfoRow label="Zip Code" value={employee.address?.zipCode} />
                  <InfoRow label="Country" value={employee.address?.country} />
                </dl>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow label="Contact Name" value={employee.emergencyContact?.name} />
                  <InfoRow label="Relation" value={employee.emergencyContact?.relation} />
                  <InfoRow label="Phone" value={employee.emergencyContact?.phone} />
                  <InfoRow label="Address" value={employee.emergencyContact?.address} />
                </dl>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Social & Professional</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow label="LinkedIn Profile" value={employee.linkedInProfile ? <a href={employee.linkedInProfile} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{employee.linkedInProfile}</a> : '-'} />
                  <InfoRow label="Skype ID" value={employee.skypeId} />
                </dl>
              </div>
            </div>
          )}

          {/* Financial Information Tab - Only visible to HR/Admin */}
          {activeTab === 'financial' && isHRorAdmin && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow label="Account Number" value={employee.bankDetails?.accountNumber} />
                  <InfoRow label="Bank Name" value={employee.bankDetails?.bankName} />
                  <InfoRow label="IFSC Code" value={employee.bankDetails?.ifscCode} />
                  <InfoRow label="Branch Name" value={employee.bankDetails?.branchName} />
                  <InfoRow label="Account Holder Name" value={employee.bankDetails?.accountHolderName} />
                </dl>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Statutory Details</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow label="UAN (Universal Account Number)" value={employee.statutoryDetails?.uan} />
                  <InfoRow label="ESI Number" value={employee.statutoryDetails?.esiNumber} />
                  <InfoRow label="PF Number" value={employee.statutoryDetails?.pfNumber} />
                </dl>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {employee.documents && employee.documents.length > 0 ? (
                <div className="overflow-x-auto -mx-3 sm:mx-0 table-responsive">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Uploaded At</th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employee.documents.map((doc, index) => (
                        <tr key={index}>
                          <td className="px-3 sm:px-6 py-4 text-sm text-gray-900">{doc.type?.replace('_', ' ').toUpperCase()}</td>
                          <td className="px-3 sm:px-6 py-4 text-sm text-gray-900 break-words">{doc.name}</td>
                          <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">{formatDate(doc.uploadedAt)}</td>
                          <td className="px-3 sm:px-6 py-4 text-sm">
                            {doc.file && (
                              <a href={doc.file} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 min-h-[44px] min-w-[44px] inline-flex items-center">
                                View
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                  <p className="mt-1 text-sm text-gray-500">No documents have been uploaded for your profile.</p>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Audit History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit History</h3>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <InfoRow label="Created At" value={formatDateTime(employee.createdAt)} />
                  <InfoRow label="Last Updated" value={formatDateTime(employee.updatedAt)} />
                </dl>
              </div>

              {/* Change History */}
              {employee.history && employee.history.length > 0 ? (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Change History</h3>
                  <div className="space-y-4">
                    {employee.history.map((change, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {change.type?.replace('_', ' ').toUpperCase()}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">
                              From: {change.oldValue} → To: {change.newValue}
                            </p>
                            {change.reason && (
                              <p className="text-sm text-gray-500 mt-1">Reason: {change.reason}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{formatDateTime(change.changedAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-6 text-center py-8 border border-gray-200 rounded-lg">
                  <History className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No change history</h3>
                  <p className="mt-1 text-sm text-gray-500">No changes have been recorded for your profile.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyProfile

