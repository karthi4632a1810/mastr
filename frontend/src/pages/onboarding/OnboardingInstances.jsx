import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Plus, Eye, Search } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'

const OnboardingInstances = () => {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['onboardingInstances', search, statusFilter],
    queryFn: async () => {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      
      const response = await api.get('/onboarding/instances', { params })
      return response.data.data || []
    },
  })

  const getProgress = (instance) => {
    if (!instance.tasks || instance.tasks.length === 0) return 0
    const completed = instance.tasks.filter(t => t.status === 'completed').length
    return Math.round((completed / instance.tasks.length) * 100)
  }

  const columns = [
    {
      key: 'employee',
      header: 'Employee',
      render: (value, row) => {
        if (!row || !row.employee) return '-'
        return (
          <div>
            <div className="font-medium text-gray-900">
              {row.employee?.firstName || ''} {row.employee?.lastName || ''}
            </div>
            <div className="text-sm text-gray-500">{row.employee?.employeeId || '-'}</div>
          </div>
        )
      }
    },
    {
      key: 'template',
      header: 'Template',
      render: (value, row) => {
        if (!row || !row.template) return '-'
        return (
          <div>
            <div className="font-medium text-gray-900">{row.template?.name || '-'}</div>
            {row.template?.version > 1 && (
              <div className="text-xs text-gray-500">v{row.template.version}</div>
            )}
          </div>
        )
      }
    },
    {
      key: 'joiningDate',
      header: 'Joining Date',
      render: (value, row) => {
        if (!row || !row.joiningDate) return '-'
        return (
          <span className="text-gray-600">
            {new Date(row.joiningDate).toLocaleDateString()}
          </span>
        )
      }
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (value, row) => {
        if (!row) return '-'
        const progress = getProgress(row)
        return (
          <div className="w-full">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">{progress}%</span>
              <span className="text-gray-500">
                {row.tasks?.filter(t => t.status === 'completed').length || 0} / {row.tasks?.length || 0}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
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
            row.status === 'completed' ? 'bg-green-100 text-green-800' :
            row.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {row.status ? row.status.replace('_', ' ') : '-'}
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
          <Link
            to={`/onboarding/instances/${row._id}`}
            className="text-primary-600 hover:text-primary-800"
          >
            <Eye className="h-4 w-4" />
          </Link>
        )
      }
    },
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Onboarding Instances</h1>
          <p className="text-gray-600 mt-1">View and manage employee onboarding processes</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'hr') && (
          <Link to="/onboarding/start">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Start Onboarding
            </Button>
          </Link>
        )}
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by employee name or email..."
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
              { value: 'pending', label: 'Pending' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' }
            ]}
          />
        </div>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={data || []}
          isLoading={isLoading}
          emptyMessage="No onboarding instances found"
        />
      </div>
    </div>
  )
}

export default OnboardingInstances

