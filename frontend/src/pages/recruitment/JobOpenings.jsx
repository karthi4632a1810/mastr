import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Plus, Search, Copy, Trash2, Eye, MoreVertical, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import Modal from '../../components/Modal'
import { useToast } from '../../contexts/ToastContext'

const JobOpenings = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [locationTypeFilter, setLocationTypeFilter] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['jobOpenings', statusFilter, departmentFilter, locationFilter, locationTypeFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (departmentFilter) params.department = departmentFilter
      if (locationFilter) params.location = locationFilter
      if (locationTypeFilter) params.locationType = locationTypeFilter
      
      const response = await api.get('/recruitment/jobs', { params })
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

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/recruitment/jobs/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['jobOpenings'])
      showToast('Job opening deleted successfully', 'success')
      setDeleteModalOpen(false)
      setJobToDelete(null)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete job opening', 'error')
    }
  })

  const duplicateMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.post(`/recruitment/jobs/${id}/duplicate`)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['jobOpenings'])
      showToast('Job opening duplicated successfully', 'success')
      navigate(`/recruitment/jobs/${data.data._id}/edit`)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to duplicate job opening', 'error')
    }
  })

  const handleDelete = (job) => {
    setJobToDelete(job)
    setDeleteModalOpen(true)
  }

  const confirmDelete = () => {
    if (jobToDelete) {
      deleteMutation.mutate(jobToDelete._id)
    }
  }

  const handleDuplicate = (job) => {
    duplicateMutation.mutate(job._id)
  }

  const filteredJobs = data?.filter(job => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      job.title?.toLowerCase().includes(searchLower) ||
      job.department?.name?.toLowerCase().includes(searchLower) ||
      job.location?.toLowerCase().includes(searchLower)
    )
  }) || []

  const columns = [
    {
      key: 'title',
      header: 'Job Title',
    },
    {
      key: 'department',
      header: 'Department',
      render: (value, row) => {
        if (!row) return '-'
        return row.department?.name || '-'
      }
    },
    {
      key: 'location',
      header: 'Location',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            <div className="font-medium">{row.location || '-'}</div>
            {row.locationType && (
              <div className="text-xs text-gray-500 capitalize">{row.locationType}</div>
            )}
          </div>
        )
      }
    },
    {
      key: 'vacancyCount',
      header: 'Vacancies',
    },
    {
      key: 'employmentType',
      header: 'Type',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className="capitalize">
            {row.employmentType ? row.employmentType.replace('_', ' ') : '-'}
          </span>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === 'open' ? 'bg-green-100 text-green-800' :
            row.status === 'draft' ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }`}>
            {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : '-'}
          </span>
        )
      }
    },
    {
      key: 'publishedTo',
      header: 'Published',
      render: (value, row) => {
        if (!row) return '-'
        const published = []
        if (row.publishedTo?.internal) published.push('Internal')
        if (row.publishedTo?.public) published.push('Public')
        if (row.publishedTo?.linkedin) published.push('LinkedIn')
        if (row.publishedTo?.naukri) published.push('Naukri')
        if (row.publishedTo?.indeed) published.push('Indeed')
        
        return published.length > 0 ? (
          <div className="text-xs">
            {published.map((p, i) => (
              <span key={i} className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded mr-1 mb-1">
                {p}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-400">Not published</span>
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
              to={`/recruitment/jobs/${row._id}`}
              className="text-primary-600 hover:text-primary-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Link
              to={`/recruitment/jobs/${row._id}/edit`}
              className="text-gray-600 hover:text-gray-800"
              title="Edit"
            >
              Edit
            </Link>
            <button
              onClick={() => handleDuplicate(row)}
              className="text-blue-600 hover:text-blue-800"
              title="Duplicate"
              disabled={duplicateMutation.isLoading}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(row)}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Job Openings</h1>
          <p className="text-gray-600 text-sm sm:text-base">Create and manage job openings</p>
        </div>
        <Link to="/recruitment/jobs/new">
          <Button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200">
            <Plus className="h-4 w-4 mr-2" />
            Create Job Opening
          </Button>
        </Link>
      </div>

      {/* Enhanced Filters */}
      <div className="card mb-6 shadow-md hover:shadow-lg transition-shadow duration-200 border-t-4 border-t-primary-500">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
          <Search className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search & Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by title, department, location..."
                className="pl-10"
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
              { value: 'draft', label: 'Draft' },
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' }
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
          <Select
            placeholder="Location Type"
            value={locationTypeFilter}
            onChange={(e) => setLocationTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Types' },
              { value: 'onsite', label: 'Onsite' },
              { value: 'remote', label: 'Remote' },
              { value: 'hybrid', label: 'Hybrid' }
            ]}
          />
        </div>
        {(search || statusFilter || departmentFilter || locationTypeFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('')
                setStatusFilter('')
                setDepartmentFilter('')
                setLocationTypeFilter('')
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
          data={filteredJobs}
          isLoading={isLoading}
          emptyMessage="No job openings found"
        />
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false)
          setJobToDelete(null)
        }}
        title="Delete Job Opening"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete <strong>{jobToDelete?.title}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteModalOpen(false)
                setJobToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              isLoading={deleteMutation.isLoading}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default JobOpenings

