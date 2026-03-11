import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Plus, Search, Copy, Eye, ToggleLeft, ToggleRight, History } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import { useToast } from '../../contexts/ToastContext'

const OnboardingTemplates = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['onboardingTemplates', search, categoryFilter, statusFilter, departmentFilter],
    queryFn: async () => {
      const params = {}
      if (search) params.search = search
      if (categoryFilter) params.category = categoryFilter
      if (statusFilter) params.status = statusFilter
      if (departmentFilter) params.department = departmentFilter
      
      const response = await api.get('/onboarding/templates', { params })
      return response.data.data || []
    },
  })

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments')
      return response.data.data || []
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.put(`/onboarding/templates/${id}/toggle-status`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['onboardingTemplates'])
      showToast('Template status updated successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update template status', 'error')
    }
  })

  const cloneMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/onboarding/templates/${id}/clone`)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['onboardingTemplates'])
      showToast('Template cloned successfully', 'success')
      navigate(`/onboarding/templates/${data.data._id}/edit`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to clone template', 'error')
    }
  })

  const getCategoryLabel = (category) => {
    const categories = {
      general: 'General',
      it: 'IT',
      departmental: 'Departmental',
      leadership: 'Leadership',
      intern: 'Intern'
    }
    return categories[category] || category
  }

  const columns = [
    {
      key: 'name',
      header: 'Template Name',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            <div className="font-medium text-gray-900">{row.name || '-'}</div>
            {row.version > 1 && (
              <div className="text-xs text-gray-500">v{row.version}</div>
            )}
          </div>
        )
      }
    },
    {
      key: 'category',
      header: 'Category',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className="capitalize">
            {getCategoryLabel(row.category) || '-'}
          </span>
        )
      }
    },
    {
      key: 'tasks',
      header: 'Tasks',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className="text-gray-600">
            {row.tasks?.length || 0} task(s)
          </span>
        )
      }
    },
    {
      key: 'linkedTo',
      header: 'Linked To',
      render: (value, row) => {
        if (!row) return '-'
        const links = []
        if (row.linkedDepartments?.length > 0) {
          links.push(`${row.linkedDepartments.length} dept(s)`)
        }
        if (row.linkedDesignations?.length > 0) {
          links.push(`${row.linkedDesignations.length} role(s)`)
        }
        if (row.linkedEmployeeTypes?.length > 0) {
          links.push(`${row.linkedEmployeeTypes.length} type(s)`)
        }
        return links.length > 0 ? links.join(', ') : 'All'
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {row.isActive ? 'Active' : 'Inactive'}
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
          <div className="flex items-center space-x-2">
            <Link
              to={`/onboarding/templates/${row._id}`}
              className="text-primary-600 hover:text-primary-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Link
              to={`/onboarding/templates/${row._id}/edit`}
              className="text-gray-600 hover:text-gray-800"
              title="Edit"
            >
              Edit
            </Link>
            <button
              onClick={() => cloneMutation.mutate(row._id)}
              className="text-blue-600 hover:text-blue-800"
              title="Clone"
              disabled={cloneMutation.isLoading}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleStatusMutation.mutate(row._id)}
              className="text-gray-600 hover:text-gray-800"
              title={row.isActive ? 'Deactivate' : 'Activate'}
            >
              {row.isActive ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        )
      }
    },
  ]

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Onboarding Templates</h1>
          <p className="text-gray-600 text-sm sm:text-base">Create and manage reusable onboarding templates</p>
        </div>
        {user?.role === 'admin' && (
          <Link to="/onboarding/templates/new">
            <Button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </Link>
        )}
      </div>

      {/* Enhanced Filters */}
      <div className="card mb-6 shadow-md hover:shadow-lg transition-shadow duration-200 border-t-4 border-t-primary-500">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <Search className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name or description..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select
            placeholder="All Categories"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={[
              { value: '', label: 'All Categories' },
              { value: 'general', label: 'General' },
              { value: 'it', label: 'IT' },
              { value: 'departmental', label: 'Departmental' },
              { value: 'leadership', label: 'Leadership' },
              { value: 'intern', label: 'Intern' }
            ]}
          />
          <Select
            placeholder="All Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
        </div>
        {(search || categoryFilter || statusFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('')
                setCategoryFilter('')
                setStatusFilter('')
              }}
              className="text-sm"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      <div className="card shadow-md">
        <Table
          columns={columns}
          data={data || []}
          isLoading={isLoading}
          emptyMessage="No onboarding templates found"
        />
      </div>
    </div>
  )
}

export default OnboardingTemplates

