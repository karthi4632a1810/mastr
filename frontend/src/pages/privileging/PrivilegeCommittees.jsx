import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Plus, Users, Edit, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'

const PrivilegeCommittees = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    members: [{
      employee: '',
      role: 'member'
    }]
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
  })

  const { data: committees, isLoading } = useQuery({
    queryKey: ['privilege-committees'],
    queryFn: async () => {
      const response = await api.get('/privileging/committees')
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/privileging/committees', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['privilege-committees'])
      setShowModal(false)
      resetForm()
      showToast('Privilege committee created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create committee', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      members: [{
        employee: '',
        role: 'member'
      }]
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || formData.members.length === 0) {
      showToast('Committee name and at least one member are required', 'error')
      return
    }
    
    // Validate that all members have an employee selected
    const invalidMembers = formData.members.filter(m => !m.employee)
    if (invalidMembers.length > 0) {
      showToast('Please select an employee for all members', 'error')
      return
    }
    
    createMutation.mutate(formData)
  }

  const addMember = () => {
    setFormData({
      ...formData,
      members: [...formData.members, {
        employee: '',
        role: 'member'
      }]
    })
  }

  const removeMember = (index) => {
    setFormData({
      ...formData,
      members: formData.members.filter((_, i) => i !== index)
    })
  }

  const updateMember = (index, field, value) => {
    const updated = [...formData.members]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, members: updated })
  }

  const columns = [
    { key: 'name', label: 'Committee Name' },
    { 
      key: 'members', 
      label: 'Members',
      render: (value) => value?.length || 0
    },
    { key: 'isActive', label: 'Status', render: (value) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        {value ? 'Active' : 'Inactive'}
      </span>
    )}
  ]

  if (!isHR && !isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Privilege Committees</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage privileging committee members</p>
        </div>
        <Button 
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="w-full sm:w-auto min-h-[44px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Committee
        </Button>
      </div>

      {/* Committees List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : committees && committees.length > 0 ? (
          <Table
            data={committees}
            columns={columns}
          />
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No committees found</h3>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        title="Create Privilege Committee"
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Committee Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Credentials Committee"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="input"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Committee Members</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addMember}>
                <Plus className="h-4 w-4 mr-1" />
                Add Member
              </Button>
            </div>

            <div className="space-y-4">
              {formData.members.map((member, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium">Member {index + 1}</h4>
                    {formData.members.length > 1 && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeMember(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Employee"
                      required
                      value={member.employee}
                      onChange={(e) => updateMember(index, 'employee', e.target.value)}
                      options={[
                        { value: '', label: 'Select Employee' },
                        ...(employees || []).map(emp => ({
                          value: emp._id,
                          label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
                        }))
                      ]}
                    />

                    <Select
                      label="Role"
                      required
                      value={member.role}
                      onChange={(e) => updateMember(index, 'role', e.target.value)}
                      options={[
                        { value: 'chairperson', label: 'Chairperson' },
                        { value: 'member', label: 'Member' },
                        { value: 'secretary', label: 'Secretary' }
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isLoading}>
              Create Committee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default PrivilegeCommittees

