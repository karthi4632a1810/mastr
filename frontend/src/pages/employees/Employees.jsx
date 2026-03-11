import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Plus, Search, Filter, Download, Upload, FileDown, Users, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../contexts/ToastContext'

const Employees = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [passwordType, setPasswordType] = useState('random')
  const [fixedPassword, setFixedPassword] = useState('')
  const [defaultImportRole, setDefaultImportRole] = useState('employee')
  const [importResults, setImportResults] = useState(null)
  const [deleteEmployeeId, setDeleteEmployeeId] = useState(null)
  const [deleteEmployeeName, setDeleteEmployeeName] = useState('')
  const { showToast } = useToast()

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', page, search, statusFilter, departmentFilter],
    queryFn: async () => {
      const params = { page, limit: 10 }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (departmentFilter) params.department = departmentFilter
      
      const response = await api.get('/employees', { params })
      return response.data
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load employees', 'error')
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data.data || []
    },
  })

  // Download template
  const downloadTemplate = async () => {
    try {
      const response = await api.get('/employees/download-template', {
        responseType: 'blob'
      })
      
      // Check if response is actually an error (JSON error returned as blob)
      if (response.data.type === 'application/json') {
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        showToast(errorData.message || 'Failed to download template', 'error')
        return
      }
      
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'employee-import-template.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      showToast('Template downloaded successfully', 'success')
    } catch (error) {
      // Handle blob error responses
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const errorData = JSON.parse(text)
          showToast(errorData.message || 'Failed to download template', 'error')
        } catch (parseError) {
          showToast('Failed to download template', 'error')
        }
      } else {
        showToast(error.response?.data?.message || error.message || 'Failed to download template', 'error')
      }
    }
  }

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/employees/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: (data) => {
      setImportResults(data)
      if (data.summary.succeeded > 0) {
        showToast(`Successfully imported ${data.summary.succeeded} employees`, 'success')
      }
      if (data.summary.failed > 0) {
        showToast(`${data.summary.failed} employees failed to import`, 'error')
      }
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Bulk import failed', 'error')
    }
  })

  // Handle bulk import
  const handleBulkImport = async (e) => {
    e.preventDefault()
    if (!importFile) {
      showToast('Please select a file', 'error')
      return
    }

    if (defaultImportRole === 'admin' && user?.role !== 'admin') {
      showToast('Only admins can create admin users', 'error')
      return
    }

    if (passwordType === 'fixed' && !fixedPassword) {
      showToast('Please enter a fixed password', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', importFile)
    formData.append('createUserAccounts', 'true')
    formData.append('passwordType', passwordType)
    formData.append('defaultRole', defaultImportRole)
    if (passwordType === 'fixed') {
      formData.append('fixedPassword', fixedPassword)
    }

    bulkImportMutation.mutate(formData)
  }

  // Download credentials from import results
  const downloadImportCredentials = () => {
    if (!importResults?.credentials || importResults.credentials.length === 0) {
      showToast('No credentials to download', 'error')
      return
    }

    const csvRows = ['Employee ID,Name,Email,Password,Role']
    importResults.credentials.forEach(cred => {
      csvRows.push(`"${cred.employeeId}","${cred.name}","${cred.email}","${cred.password}","${cred.role}"`)
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `employee-credentials-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    showToast('Credentials downloaded successfully', 'success')
  }

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId) => {
      const response = await api.delete(`/employees/${employeeId}`)
      return response.data
    },
    onSuccess: () => {
      showToast('Employee deleted successfully', 'success')
      setDeleteEmployeeId(null)
      setDeleteEmployeeName('')
      // Refetch employees list
      queryClient.invalidateQueries(['employees'])
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete employee', 'error')
      setDeleteEmployeeId(null)
      setDeleteEmployeeName('')
    }
  })

  const handleDeleteClick = (employee) => {
    setDeleteEmployeeId(employee._id)
    setDeleteEmployeeName(`${employee.firstName} ${employee.lastName}`)
  }

  const handleDeleteConfirm = () => {
    if (deleteEmployeeId) {
      deleteEmployeeMutation.mutate(deleteEmployeeId)
    }
  }

  // Download all credentials
  const downloadAllCredentials = async () => {
    try {
      // Call endpoint without credentials array to fetch all
      const response = await api.post('/employees/download-credentials', {}, {
        responseType: 'blob'
      })
      
      // Check if response is actually an error (JSON error returned as blob)
      if (response.data.type === 'application/json') {
        const text = await response.data.text()
        const errorData = JSON.parse(text)
        showToast(errorData.message || 'Failed to download credentials', 'error')
        return
      }
      
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `all-credentials-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      showToast('Credentials downloaded successfully. Note: Passwords are hashed and cannot be retrieved. Use password reset for employees.', 'success')
    } catch (error) {
      // Handle blob error responses
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const errorData = JSON.parse(text)
          showToast(errorData.message || 'Failed to download credentials', 'error')
        } catch (parseError) {
          showToast('Failed to download credentials', 'error')
        }
      } else {
        showToast(error.response?.data?.message || error.message || 'Failed to download credentials', 'error')
      }
    }
  }

  const columns = [
    {
      key: 'employeeId',
      header: 'Employee ID',
    },
    {
      key: 'name',
      header: 'Name',
      render: (value, row) => {
        if (!row) return '-'
        return `${row.firstName || ''} ${row.lastName || ''}`.trim() || '-'
      }
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'department',
      header: 'Department',
      render: (value, row) => {
        if (!row) return '-'
        return row.department?.name || value || '-'
      }
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (value, row) => {
        if (!row) return '-'
        return row.designation?.name || value || '-'
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (!row) return '-'
        const status = row.status || value
        if (!status) return '-'
        return (
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
            status === 'active' ? 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200' :
            status === 'notice_period' ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200' :
            'bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200'
          }`}>
            {status?.replace('_', ' ').toUpperCase() || '-'}
          </span>
        )
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value, row) => {
        if (!row || !row._id) return '-'
        return (
          <div className="flex space-x-2 items-center flex-wrap gap-2">
            <Link
              to={`/employees/${row._id}`}
              className="text-primary-600 hover:text-primary-700 hover:bg-primary-50 active:text-primary-800 font-medium min-h-[44px] px-3 py-2 flex items-center rounded-md transition-all duration-200"
            >
              View
            </Link>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <Link
              to={`/employees/${row._id}/edit`}
              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 active:text-gray-800 font-medium min-h-[44px] px-3 py-2 flex items-center rounded-md transition-all duration-200"
            >
              Edit
            </Link>
            {user?.role === 'admin' && (
              <>
                <span className="text-gray-300 hidden sm:inline">|</span>
                <button
                  onClick={() => handleDeleteClick(row)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 active:text-red-800 font-medium flex items-center gap-1 min-h-[44px] px-3 py-2 rounded-md transition-all duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        )
      }
    },
  ]

  return (
    <div className="space-y-6">
      {/* Enhanced Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Employees</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage your organization's employees efficiently</p>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <Button 
            variant="secondary" 
            onClick={downloadTemplate}
            className="hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            <FileDown className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Download Template</span>
            <span className="sm:hidden">Template</span>
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowBulkImport(true)}
            className="hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Bulk Import</span>
            <span className="sm:hidden">Import</span>
          </Button>
          <Button 
            variant="secondary" 
            onClick={downloadAllCredentials}
            className="hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow"
          >
            <Users className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Download Credentials</span>
            <span className="sm:hidden">Credentials</span>
          </Button>
          <Link to="/employees/new">
            <Button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Enhanced Filter Card */}
      <div className="card mb-6 shadow-md hover:shadow-lg transition-shadow duration-200 border-t-4 border-t-primary-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
              <Input
                type="text"
                placeholder="Search by name, email, or employee ID..."
                className="pl-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select
            placeholder="All Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'notice_period', label: 'Notice Period' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
          <Select
            placeholder="All Departments"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...(departments?.map(dept => ({ value: dept._id, label: dept.name })) || [])
            ]}
          />
        </div>
      </div>

      {/* Enhanced Table Card */}
      <div className="card shadow-md hover:shadow-lg transition-shadow duration-200">
        <Table
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="No employees found"
        />
        
        {data?.pagination && data.pagination.total > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Showing <span className="text-gray-900 font-semibold">{((page - 1) * 10) + 1}</span> to <span className="text-gray-900 font-semibold">{Math.min(page * 10, data.pagination.total)}</span> of <span className="text-gray-900 font-semibold">{data.pagination.total}</span> results
            </div>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= data.pagination.pages}
                className="disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      <Modal
        isOpen={showBulkImport}
        onClose={() => {
          setShowBulkImport(false)
          setImportFile(null)
          setImportResults(null)
          setPasswordType('random')
          setFixedPassword('')
          setDefaultImportRole('employee')
        }}
        title="Bulk Import Employees"
      >
        {!importResults ? (
          <form onSubmit={handleBulkImport} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Excel/CSV File
              </label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Supported formats: .xlsx, .xls, .csv
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create User Accounts
              </label>
              <p className="text-sm text-gray-500 mb-2">
                User accounts will be created automatically for imported employees
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Role (used when Role column is empty)
              </label>
              <Select
                value={defaultImportRole}
                onChange={(e) => setDefaultImportRole(e.target.value)}
                options={[
                  ...(user?.role === 'admin' ? [{ value: 'admin', label: 'Admin' }] : []),
                  { value: 'hr', label: 'HR' },
                  { value: 'employee', label: 'Employee' }
                ]}
              />
              {user?.role !== 'admin' && (
                <p className="mt-1 text-xs text-amber-600">
                  Only admins can import admin users
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password Type
              </label>
              <Select
                value={passwordType}
                onChange={(e) => setPasswordType(e.target.value)}
                options={[
                  { value: 'random', label: 'Random Password (Recommended)' },
                  { value: 'fixed', label: 'Fixed Password for All' }
                ]}
              />
              {passwordType === 'random' && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    ⚠️ Important: Random Password Information
                  </p>
                  <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                    <li>Each user will get a unique random 16-character password</li>
                    <li>Passwords are generated automatically and cannot be retrieved later</li>
                    <li>You MUST download the credentials CSV file immediately after import to view passwords</li>
                    <li>Passwords are only shown once in the download file - save it securely!</li>
                  </ul>
                </div>
              )}
            </div>

            {passwordType === 'fixed' && (
              <div>
                <Input
                  label="Fixed Password"
                  type="password"
                  value={fixedPassword}
                  onChange={(e) => setFixedPassword(e.target.value)}
                  required={passwordType === 'fixed'}
                  placeholder="Enter password for all users"
                />
                <p className="mt-1 text-xs text-gray-500">
                  All imported users will have this same password
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowBulkImport(false)
                  setImportFile(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={bulkImportMutation.isLoading}
              >
                Import Employees
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Import Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{importResults.summary.total}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Succeeded</p>
                  <p className="text-2xl font-bold text-green-600">{importResults.summary.succeeded}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{importResults.summary.failed}</p>
                </div>
              </div>
            </div>

            {importResults.credentials && importResults.credentials.length > 0 && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      {importResults.credentials.length} user accounts created
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      ⚠️ Download credentials NOW - passwords cannot be retrieved later!
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={downloadImportCredentials}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Credentials CSV
                  </Button>
                </div>
                <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Credentials Preview (First 5):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-1">Employee ID</th>
                          <th className="text-left p-1">Name</th>
                          <th className="text-left p-1">Email</th>
                          <th className="text-left p-1">Password</th>
                          <th className="text-left p-1">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResults.credentials.slice(0, 5).map((cred, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-1 font-mono text-xs">{cred.employeeId || 'N/A'}</td>
                            <td className="p-1">{cred.name}</td>
                            <td className="p-1">{cred.email}</td>
                            <td className="p-1 font-mono text-xs bg-gray-50">{cred.password}</td>
                            <td className="p-1">{cred.role}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importResults.credentials.length > 5 && (
                    <p className="text-xs text-gray-500 mt-2">
                      ... and {importResults.credentials.length - 5} more. Download CSV to see all.
                    </p>
                  )}
                </div>
                <p className="text-xs text-blue-800 mt-3 font-medium">
                  📥 The CSV file contains: Employee ID, Name, Email, Password, and Role for all {importResults.credentials.length} users
                </p>
              </div>
            )}

            {importResults.summary.failed > 0 && (
              <div className="max-h-64 overflow-y-auto">
                <h4 className="font-medium text-gray-900 mb-2">Failed Imports</h4>
                <div className="space-y-2">
                  {importResults.results
                    .filter(r => !r.success)
                    .map((result, idx) => (
                      <div key={idx} className="p-3 bg-red-50 rounded border border-red-200">
                        <p className="text-sm font-medium text-red-900">
                          Row {result.row}: {result.data.firstName} {result.data.lastName} ({result.data.email})
                        </p>
                        <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
                          {result.errors.map((error, errIdx) => (
                            <li key={errIdx}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowBulkImport(false)
                  setImportFile(null)
                  setImportResults(null)
                  setPasswordType('random')
                  setFixedPassword('')
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setImportResults(null)
                  setImportFile(null)
                }}
              >
                Import Another File
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteEmployeeId}
        onClose={() => {
          setDeleteEmployeeId(null)
          setDeleteEmployeeName('')
        }}
        title="Delete Employee"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to permanently delete <strong>{deleteEmployeeName}</strong>?
          </p>
          <p className="text-sm text-red-600 font-medium">
            ⚠️ Warning: This action cannot be undone. The employee and their associated user account will be permanently removed from the system.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDeleteEmployeeId(null)
                setDeleteEmployeeName('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={deleteEmployeeMutation.isLoading}
            >
              Delete Employee
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Employees
