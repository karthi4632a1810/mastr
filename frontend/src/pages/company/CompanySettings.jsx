import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Edit, Trash2, Building2, MapPin, Phone, Mail } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'

const CompanySettings = () => {
  const { isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    legalName: '',
    registrationNumber: '',
    taxId: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    isActive: true
  })

  const { data: companies, isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await api.get('/companies')
      return response.data.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load companies', 'error')
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/companies', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies'])
      setShowCreateModal(false)
      resetForm()
      showToast('Company created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create company', 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/companies/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies'])
      setShowEditModal(null)
      resetForm()
      showToast('Company updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update company', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/companies/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['companies'])
      setShowDeleteModal(null)
      showToast('Company deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete company', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      legalName: '',
      registrationNumber: '',
      taxId: '',
      address: { street: '', city: '', state: '', zipCode: '', country: '' },
      contact: { phone: '', email: '', website: '' },
      isActive: true
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.code) {
      showToast('Name and code are required', 'error')
      return
    }
    // Validate email format if provided
    if (formData.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact.email)) {
      showToast('Please enter a valid email address', 'error')
      return
    }
    // Validate phone format if provided
    if (formData.contact.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.contact.phone)) {
      showToast('Please enter a valid phone number', 'error')
      return
    }
    
    if (showEditModal) {
      updateMutation.mutate({ id: showEditModal._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (company) => {
    setShowEditModal(company)
    setFormData({
      name: company.name || '',
      code: company.code || '',
      legalName: company.legalName || '',
      registrationNumber: company.registrationNumber || '',
      taxId: company.taxId || '',
      address: company.address || { street: '', city: '', state: '', zipCode: '', country: '' },
      contact: company.contact || { phone: '', email: '', website: '' },
      isActive: company.isActive !== undefined ? company.isActive : true
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600 mt-1">Manage company information</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Company
          </Button>
        )}
      </div>

      {/* Companies List */}
      <div className="card">
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading companies..." />
        ) : error ? (
          <EmptyState
            icon={Building2}
            title="Error loading companies"
            message={error.response?.data?.message || 'Failed to load companies. Please try again.'}
          />
        ) : companies && companies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <div key={company._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-primary-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                      <p className="text-sm text-gray-500">{company.code}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {company.legalName && (
                    <div>
                      <span className="text-gray-500">Legal Name:</span>
                      <p className="text-gray-900">{company.legalName}</p>
                    </div>
                  )}
                  {company.contact?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{company.contact.email}</span>
                    </div>
                  )}
                  {company.contact?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{company.contact.phone}</span>
                    </div>
                  )}
                  {company.address?.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {company.address.city}, {company.address.state}
                      </span>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(company)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setShowDeleteModal(company)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No companies found"
            message="Add your first company to get started"
            actionLabel={isAdmin ? "Add Company" : undefined}
            onAction={isAdmin ? () => setShowCreateModal(true) : undefined}
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || !!showEditModal}
        title={showEditModal ? 'Edit Company' : 'Add Company'}
        onClose={() => {
          setShowCreateModal(false)
          setShowEditModal(null)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Company Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Company Code"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <Input
            label="Legal Name"
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Registration Number"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            />
            <Input
              label="Tax ID"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Address</h4>
            <div className="space-y-3">
              <Input
                label="Street"
                value={formData.address.street}
                onChange={(e) => setFormData({
                  ...formData,
                  address: { ...formData.address, street: e.target.value }
                })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  value={formData.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value }
                  })}
                />
                <Input
                  label="State"
                  value={formData.address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, state: e.target.value }
                  })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Zip Code"
                  value={formData.address.zipCode}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, zipCode: e.target.value }
                  })}
                />
                <Input
                  label="Country"
                  value={formData.address.country}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, country: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
            <div className="space-y-3">
              <Input
                label="Phone"
                type="tel"
                value={formData.contact.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  contact: { ...formData.contact, phone: e.target.value }
                })}
              />
              <Input
                label="Email"
                type="email"
                value={formData.contact.email}
                onChange={(e) => setFormData({
                  ...formData,
                  contact: { ...formData.contact, email: e.target.value }
                })}
              />
              <Input
                label="Website"
                type="url"
                value={formData.contact.website}
                onChange={(e) => setFormData({
                  ...formData,
                  contact: { ...formData.contact, website: e.target.value }
                })}
              />
            </div>
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false)
                setShowEditModal(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading || updateMutation.isLoading}>
              {showEditModal ? 'Update' : 'Create'} Company
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={!!showDeleteModal}
          title="Delete Company"
          onClose={() => setShowDeleteModal(null)}
        >
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete the company <strong>{showDeleteModal.name}</strong>? This action cannot be undone.
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

export default CompanySettings

