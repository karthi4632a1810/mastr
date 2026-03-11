import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Download, Trash2, FileText, Upload, User, Calendar } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { format } from 'date-fns'

const Documents = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [uploadData, setUploadData] = useState({
    employeeId: '',
    category: '',
    documentType: '',
    description: '',
    file: null
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees', { params: { limit: 1000 } })
      return response.data.data || []
    },
    enabled: isHR || isAdmin
  })

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents', employeeFilter, categoryFilter],
    queryFn: async () => {
      const params = {}
      if (employeeFilter) params.employeeId = employeeFilter
      if (categoryFilter) params.category = categoryFilter
      const response = await api.get('/documents', { params })
      return response.data.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load documents', 'error')
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (formData) => {
      return api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documents'])
      setShowUploadModal(false)
      setUploadData({ employeeId: '', category: '', documentType: '', description: '', file: null })
      showToast('Document uploaded successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to upload document', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/documents/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documents'])
      setShowDeleteModal(null)
      showToast('Document deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete document', 'error')
    },
  })

  const handleUpload = (e) => {
    e.preventDefault()
    if (!uploadData.file) {
      showToast('Please select a file', 'error')
      return
    }
    // Validate file size (max 10MB)
    if (uploadData.file.size > 10 * 1024 * 1024) {
      showToast('File size must be less than 10MB', 'error')
      return
    }
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(uploadData.file.type)) {
      showToast('Invalid file type. Please upload PDF, Word, or Image files only', 'error')
      return
    }
    if ((isHR || isAdmin) && !uploadData.employeeId) {
      showToast('Please select an employee', 'error')
      return
    }

    const formData = new FormData()
    formData.append('document', uploadData.file)
    if (uploadData.employeeId) formData.append('employeeId', uploadData.employeeId)
    if (uploadData.category) formData.append('category', uploadData.category)
    if (uploadData.documentType) formData.append('documentType', uploadData.documentType)
    if (uploadData.description) formData.append('description', uploadData.description)

    uploadMutation.mutate(formData)
  }

  const handleDownload = async (document) => {
    try {
      const response = await api.get(`/documents/${document._id}/download`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', document.fileName || 'document')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      showToast('Failed to download document', 'error')
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isHR || isAdmin ? 'Document Management' : 'My Documents'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isHR || isAdmin 
              ? 'Manage employee documents' 
              : 'View and manage your documents'}
          </p>
        </div>
        {(isHR || isAdmin) && (
          <Button onClick={() => setShowUploadModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Filters */}
      {(isHR || isAdmin) && (
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Filter by Employee"
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Employees' },
                ...(employees?.map(emp => ({
                  value: emp._id,
                  label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
                })) || [])
              ]}
            />
            <Input
              label="Filter by Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="e.g., ID Proof, Contract, Certificate"
            />
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="card">
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading documents..." />
        ) : error ? (
          <EmptyState
            icon={FileText}
            title="Error loading documents"
            message={error.response?.data?.message || 'Failed to load documents. Please try again.'}
          />
        ) : documents && documents.length > 0 ? (
          <div className="space-y-4">
            {documents.map((document) => (
              <div key={document._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {document.fileName || document.documentType || 'Document'}
                      </h3>
                    </div>

                    {(isHR || isAdmin) && document.employee && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Employee:</span> {document.employee?.firstName} {document.employee?.lastName}
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      {document.category && (
                        <div>
                          <span className="text-gray-500">Category:</span>
                          <p className="text-gray-900">{document.category}</p>
                        </div>
                      )}
                      {document.documentType && (
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <p className="text-gray-900">{document.documentType}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Uploaded:</span>
                        <p className="text-gray-900">
                          {format(new Date(document.uploadedAt || document.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>

                    {document.description && (
                      <p className="text-sm text-gray-600 mt-2">{document.description}</p>
                    )}
                  </div>

                  <div className="ml-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(document)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                    {(isHR || isAdmin) && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowDeleteModal(document)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No documents found"
            message={isHR || isAdmin 
              ? 'No documents uploaded yet. Upload your first document to get started.' 
              : 'You don\'t have any documents yet.'}
            actionLabel={isHR || isAdmin ? "Upload Document" : undefined}
            onAction={isHR || isAdmin ? () => setShowUploadModal(true) : undefined}
          />
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        title="Upload Document"
        onClose={() => {
          setShowUploadModal(false)
          setUploadData({ employeeId: '', category: '', documentType: '', description: '', file: null })
        }}
      >
        <form onSubmit={handleUpload} className="space-y-4">
          {(isHR || isAdmin) && (
            <Select
              label="Employee"
              required
              value={uploadData.employeeId}
              onChange={(e) => setUploadData({ ...uploadData, employeeId: e.target.value })}
              options={[
                { value: '', label: 'Select employee' },
                ...(employees?.map(emp => ({
                  value: emp._id,
                  label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
                })) || [])
              ]}
            />
          )}

          <Input
            label="Category"
            value={uploadData.category}
            onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
            placeholder="e.g., ID Proof, Contract, Certificate"
          />

          <Input
            label="Document Type"
            value={uploadData.documentType}
            onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
            placeholder="e.g., Aadhaar, PAN, Passport"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input"
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => setUploadData({ ...uploadData, file: e.target.files[0] })}
              className="input"
            />
            <p className="mt-1 text-xs text-gray-500">
              Accepted formats: PDF, Word, JPG, PNG (Max size: 10MB)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowUploadModal(false)
                setUploadData({ employeeId: '', category: '', documentType: '', description: '', file: null })
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={uploadMutation.isLoading}>
              Upload Document
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={!!showDeleteModal}
          title="Delete Document"
          onClose={() => setShowDeleteModal(null)}
        >
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete this document? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setShowDeleteModal(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteMutation.mutate(showDeleteModal._id)}
              isLoading={deleteMutation.isLoading}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Documents

