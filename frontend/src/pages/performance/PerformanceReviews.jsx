import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Search, Eye, CheckCircle, AlertCircle, Clock, Lock } from 'lucide-react'
import { useState } from 'react'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'

const PerformanceReviews = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [performanceCycleFilter, setPerformanceCycleFilter] = useState('')

  const { data: cycles } = useQuery({
    queryKey: ['performanceCycles', 'active'],
    queryFn: async () => {
      const response = await api.get('/performance-cycles', { params: { status: 'active' } })
      return response.data.data || []
    },
  })

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['performanceReviews', search, statusFilter, performanceCycleFilter],
    queryFn: async () => {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (performanceCycleFilter) params.performanceCycleId = performanceCycleFilter
      
      const response = await api.get('/performance-reviews', { params })
      return response.data.data || []
    },
  })

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-800',
      needs_review: 'bg-yellow-100 text-yellow-800',
      pending_manager_feedback: 'bg-blue-100 text-blue-800',
      finalized: 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      needs_review: 'Needs Review',
      pending_manager_feedback: 'Pending Manager Feedback',
      finalized: 'Finalized'
    }
    return labels[status] || status
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
            <div className="text-xs text-gray-500">{row.employee?.employeeId || '-'}</div>
          </div>
        )
      }
    },
    {
      key: 'cycle',
      header: 'Performance Cycle',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className="text-sm text-gray-600">{row.performanceCycle?.name || '-'}</span>
        )
      }
    },
    {
      key: 'selfAssessment',
      header: 'Self-Assessment',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            {row.selfAssessment ? (
              <>
                <div className="text-sm font-medium text-gray-900">
                  {row.selfAssessment.weightedScore != null ? row.selfAssessment.weightedScore.toFixed(2) : 'N/A'} / 5.00
                </div>
                <div className="text-xs text-gray-500">
                  {row.selfAssessment.status === 'submitted' ? 'Submitted' : 'Draft'}
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-400">Not submitted</span>
            )}
          </div>
        )
      }
    },
    {
      key: 'finalRating',
      header: 'Final Rating',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <div>
            {row.finalRating?.numeric != null ? (
              <span className="font-medium text-gray-900">{Number(row.finalRating.numeric).toFixed(2)} / 5.00</span>
            ) : row.finalRating?.grade ? (
              <span className="font-medium text-gray-900">Grade {row.finalRating.grade}</span>
            ) : (
              <span className="text-sm text-gray-400">Not rated</span>
            )}
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
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
              {getStatusLabel(row.status)}
            </span>
            {row.isLocked && (
              <Lock className="h-4 w-4 text-gray-400" title="Locked" />
            )}
          </div>
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
            to={`/performance/reviews/${row._id}`}
            className="text-primary-600 hover:text-primary-800"
            title="Review"
          >
            <Eye className="h-4 w-4" />
          </Link>
        )
      }
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Performance Reviews</h1>
        <p className="text-gray-600 mt-1">Review and finalize employee performance ratings</p>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by employee name or ID..."
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
              { value: 'needs_review', label: 'Needs Review' },
              { value: 'pending_manager_feedback', label: 'Pending Manager Feedback' },
              { value: 'finalized', label: 'Finalized' }
            ]}
          />
          <Select
            placeholder="All Cycles"
            value={performanceCycleFilter}
            onChange={(e) => setPerformanceCycleFilter(e.target.value)}
            options={[
              { value: '', label: 'All Cycles' },
              ...(cycles?.map(cycle => ({
                value: cycle._id,
                label: cycle.name
              })) || [])
            ]}
          />
        </div>
      </div>

      <div className="card">
        <Table
          columns={columns}
          data={reviews || []}
          isLoading={isLoading}
          emptyMessage="No performance reviews found"
        />
      </div>
    </div>
  )
}

export default PerformanceReviews

