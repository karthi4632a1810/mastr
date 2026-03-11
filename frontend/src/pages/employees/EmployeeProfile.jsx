import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState, useEffect } from 'react'
import { Edit, ArrowLeft, User, Briefcase, Phone, FileText, History, DollarSign, CreditCard, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import { format } from 'date-fns'

const EmployeeProfile = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('personal')
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [lastSetPassword, setLastSetPassword] = useState(null) // Store the last password that was set
  const isHRorAdmin = isHR || isAdmin

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const response = await api.get(`/employees/${id}`)
      return response.data.data
    },
    retry: false,
  })

  // Get user password info (only for HR/Admin)
  const { data: passwordInfo, refetch: refetchPassword } = useQuery({
    queryKey: ['user-password', employee?.userId?._id || employee?.userId],
    queryFn: async () => {
      if (!employee?.userId?._id && !employee?.userId) return null
      const userId = employee.userId._id || employee.userId
      const response = await api.get(`/users/${userId}/password`)
      return response.data.data
    },
    enabled: isHRorAdmin && !!(employee?.userId?._id || employee?.userId),
    retry: false,
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (password) => {
      const userId = employee.userId._id || employee.userId
      const response = await api.put(`/users/${userId}/password`, { newPassword: password })
      return { ...response.data, setPassword: password } // Include the password we just set
    },
    onSuccess: (data) => {
      const resetPassword = data.setPassword || data.data?.newPassword || newPassword
      setLastSetPassword(resetPassword) // Store the password that was just set
      showToast(`Password reset successfully. New password: ${resetPassword}`, 'success')
      setShowPasswordModal(false)
      setNewPassword('')
      refetchPassword()
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to reset password', 'error')
    }
  })

  // Sync email mutation
  const syncEmailMutation = useMutation({
    mutationFn: async () => {
      const userId = employee.userId._id || employee.userId
      const response = await api.put(`/users/${userId}/sync-email`)
      return response.data
    },
    onSuccess: (data) => {
      showToast(`Email synced: ${data.data.oldEmail} → ${data.data.newEmail}`, 'success')
      refetchPassword()
      queryClient.invalidateQueries(['employee', id])
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to sync email', 'error')
    }
  })

  // Redirect employees to their own profile page if they try to view someone else's profile
  useEffect(() => {
    if (employee && user && !isHRorAdmin) {
      const isViewingOwnProfile = employee.userId && (
        employee.userId._id === user._id || 
        employee.userId._id?.toString() === user._id?.toString() ||
        employee.userId === user._id ||
        employee.userId?.toString() === user._id?.toString()
      )
      
      if (!isViewingOwnProfile) {
        // Redirect to my-profile if they're trying to view someone else's profile
        navigate('/my-profile', { replace: true })
      }
    }
  }, [employee, user, isHRorAdmin, navigate])

  // Handle access denied error
  useEffect(() => {
    if (error && error.response?.status === 403) {
      navigate('/my-profile', { replace: true })
    }
  }, [error, navigate])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    if (error.response?.status === 403) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">Access denied. You can only view your own profile.</p>
          <Button variant="secondary" onClick={() => navigate('/my-profile')} className="mt-4">
            Go to My Profile
          </Button>
        </div>
      )
    }
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Employee not found</p>
        <Button variant="secondary" onClick={() => navigate('/employees')} className="mt-4">
          Back to Employees
        </Button>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Employee not found</p>
        <Button variant="secondary" onClick={() => navigate('/employees')} className="mt-4">
          Back to Employees
        </Button>
      </div>
    )
  }

  // Check if viewing own profile (for non-HR/Admin users)
  const isViewingOwnProfile = !isHRorAdmin && employee.userId && (
    employee.userId._id === user?._id || 
    employee.userId._id?.toString() === user?._id?.toString() ||
    employee.userId === user?._id ||
    employee.userId?.toString() === user?._id?.toString()
  )

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'job', label: 'Job', icon: Briefcase },
    { id: 'contact', label: 'Contact', icon: Phone },
    ...(isHRorAdmin ? [{ id: 'financial', label: 'Financial', icon: DollarSign }] : []),
    ...(isHRorAdmin && employee?.userId ? [{ id: 'password', label: 'Password', icon: Lock }] : []),
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
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center space-x-4 flex-1">
          <Button
            variant="secondary"
            onClick={() => navigate('/employees')}
            className="flex items-center hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Employee ID: <span className="font-semibold">{employee.employeeId}</span> | {employee.department?.name} | {employee.designation?.name}
            </p>
          </div>
        </div>
        {isHRorAdmin && (
          <Link to={`/employees/${id}/edit`}>
            <Button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200">
              <Edit className="h-4 w-4 mr-2" />
              Edit Employee
            </Button>
          </Link>
        )}
      </div>

      {/* Enhanced Profile Header Card */}
      <div className="card mb-6 shadow-lg border-t-4 border-t-primary-500 hover:shadow-xl transition-shadow duration-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative">
            <div className="h-28 w-28 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center shadow-md ring-4 ring-white">
              {employee.profilePhoto ? (
                <img src={employee.profilePhoto} alt={`${employee.firstName} ${employee.lastName}`} className="h-28 w-28 rounded-full object-cover" />
              ) : (
                <User className="h-14 w-14 text-primary-600" />
              )}
            </div>
          </div>
          <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h2>
                <p className="text-gray-600 mt-1">{employee.email}</p>
              </div>
              <div className="sm:ml-auto">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                  employee.status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200' :
                  employee.status === 'notice_period' ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200' :
                  'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
                }`}>
                  {employee.status?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 block text-xs mb-1">Department</span>
                <span className="font-semibold text-gray-900">{employee.department?.name || '-'}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 block text-xs mb-1">Designation</span>
                <span className="font-semibold text-gray-900">{employee.designation?.name || '-'}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 block text-xs mb-1">Branch</span>
                <span className="font-semibold text-gray-900">{employee.branch?.name || '-'}</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 block text-xs mb-1">Joining Date</span>
                <span className="font-semibold text-gray-900">{formatDate(employee.joiningDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="card shadow-lg">
        <div className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-transparent">
          <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto scrollbar-thin" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-3 sm:px-4 border-b-2 font-semibold text-sm flex items-center space-x-2 whitespace-nowrap transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
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
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded At</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employee.documents.map((doc, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.type?.replace('_', ' ').toUpperCase()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(doc.uploadedAt)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {doc.file && (
                              <a href={doc.file} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800">
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
                  <p className="mt-1 text-sm text-gray-500">No documents have been uploaded for this employee.</p>
                </div>
              )}
            </div>
          )}

          {/* Password Tab - Only for HR/Admin */}
          {activeTab === 'password' && isHRorAdmin && employee?.userId && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Password Management</h3>
                
                {passwordInfo ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900">{passwordInfo.email}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Role</dt>
                          <dd className="mt-1 text-sm text-gray-900 capitalize">{passwordInfo.role}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {passwordInfo.lastLogin ? formatDateTime(passwordInfo.lastLogin) : 'Never'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Current Password</dt>
                          <dd className="mt-1 text-sm">
                            {(passwordInfo.matchedPassword || lastSetPassword) ? (
                              <div className="flex items-center space-x-2">
                                <span className="text-green-600 font-mono bg-green-50 px-2 py-1 rounded">
                                  {showCurrentPassword ? (lastSetPassword || passwordInfo.matchedPassword) : '••••••••'}
                                </span>
                                <button
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  className="text-gray-500 hover:text-gray-700"
                                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                                >
                                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                {lastSetPassword && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    Recently set
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-400 italic">Unknown (not a common password)</span>
                                <span className="text-xs text-gray-500">(Reset password to view)</span>
                              </div>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Passwords are stored as hashed values. The system can only detect if the password matches common default passwords.
                      </p>
                    </div>

                    {/* Email sync warning if emails don't match */}
                    {passwordInfo.email !== employee.email && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-yellow-800 mb-1">
                              Email Mismatch Detected
                            </p>
                            <p className="text-sm text-yellow-700">
                              User account email: <strong>{passwordInfo.email}</strong><br />
                              Employee email: <strong>{employee.email}</strong>
                            </p>
                            <p className="text-xs text-yellow-600 mt-2">
                              Click "Sync Email" to update the user account email to match the employee email.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      {passwordInfo.email !== employee.email && (
                        <Button
                          variant="secondary"
                          onClick={() => syncEmailMutation.mutate()}
                          disabled={syncEmailMutation.isPending}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${syncEmailMutation.isPending ? 'animate-spin' : ''}`} />
                          {syncEmailMutation.isPending ? 'Syncing...' : 'Sync Email'}
                        </Button>
                      )}
                      <Button onClick={() => setShowPasswordModal(true)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 border border-gray-200 rounded-lg">
                    <Lock className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No user account found</h3>
                    <p className="mt-1 text-sm text-gray-500">This employee does not have a user account linked.</p>
                  </div>
                )}
              </div>
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
                  <p className="mt-1 text-sm text-gray-500">No changes have been recorded for this employee.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <Modal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false)
            setNewPassword('')
          }}
          title="Reset Password"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password *
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">
                Minimum 6 characters required
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will immediately change the user's password. Make sure to inform the employee.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPasswordModal(false)
                  setNewPassword('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (newPassword.length < 6) {
                    showToast('Password must be at least 6 characters', 'error')
                    return
                  }
                  resetPasswordMutation.mutate(newPassword)
                }}
                disabled={resetPasswordMutation.isPending || newPassword.length < 6}
              >
                {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default EmployeeProfile

