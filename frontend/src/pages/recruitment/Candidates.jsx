import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { Plus, Search, Eye, Download, FileText, Clock } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'

const Candidates = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [jobFilter, setJobFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, stageFilter, statusFilter, sourceFilter, jobFilter],
    queryFn: async () => {
      const params = {}
      if (search) params.search = search
      if (stageFilter) params.stage = stageFilter
      if (statusFilter) params.status = statusFilter
      if (sourceFilter) params.source = sourceFilter
      if (jobFilter) params.jobOpening = jobFilter
      
      const response = await api.get('/recruitment/candidates', { params })
      return response.data.data || []
    },
  })

  const { data: jobOpenings } = useQuery({
    queryKey: ['jobOpenings'],
    queryFn: async () => {
      const response = await api.get('/recruitment/jobs')
      return response.data.data || []
    },
  })

  const columns = [
    {
      key: 'name',
      header: 'Candidate Name',
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
      key: 'phone',
      header: 'Phone',
    },
    {
      key: 'jobOpening',
      header: 'Job Opening',
      render: (value, row) => {
        if (!row) return '-'
        return row.jobOpening?.title || '-'
      }
    },
    {
      key: 'experience',
      header: 'Experience',
      render: (value, row) => {
        if (!row || !row.experience) return '-'
        const exp = row.experience
        const parts = []
        if (exp.years > 0) parts.push(`${exp.years} year${exp.years > 1 ? 's' : ''}`)
        if (exp.months > 0) parts.push(`${exp.months} month${exp.months > 1 ? 's' : ''}`)
        return parts.length > 0 ? parts.join(', ') : '0 years'
      }
    },
    {
      key: 'source',
      header: 'Source',
      render: (value, row) => {
        if (!row) return '-'
        return (
          <span className="capitalize">
            {row.source ? row.source.replace('_', ' ') : '-'}
          </span>
        )
      }
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (value, row) => {
        if (!row) return '-'
        const getStageLabel = (stage) => {
          const stages = {
            applied: 'Applied',
            screening: 'Screening',
            shortlisted: 'Shortlisted',
            interview: 'Interview',
            hr_interview: 'HR Interview',
            manager_round: 'Manager Round',
            offer: 'Offer',
            hired: 'Hired',
            rejected: 'Rejected'
          }
          return stages[stage] || stage
        }

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.stage === 'hired' ? 'bg-green-100 text-green-800' :
            row.stage === 'rejected' ? 'bg-red-100 text-red-800' :
            row.stage === 'offer' ? 'bg-blue-100 text-blue-800' :
            row.stage === 'hr_interview' || row.stage === 'manager_round' ? 'bg-purple-100 text-purple-800' :
            row.stage === 'interview' ? 'bg-indigo-100 text-indigo-800' :
            row.stage === 'shortlisted' ? 'bg-cyan-100 text-cyan-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {getStageLabel(row.stage)}
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
              to={`/recruitment/candidates/${row._id}`}
              className="text-primary-600 hover:text-primary-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Link>
            {row.resume && (
              <a
                href={row.resume}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800"
                title="View Resume"
              >
                <FileText className="h-4 w-4" />
              </a>
            )}
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
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Candidates</h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage candidate applications</p>
        </div>
        <div className="flex space-x-2">
          <Link to="/recruitment/candidates/aging-report">
            <Button variant="secondary" className="shadow-sm hover:shadow transition-all duration-200">
              <Clock className="h-4 w-4 mr-2" />
              Aging Report
            </Button>
          </Link>
          <Link to="/recruitment/candidates/new">
            <Button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md hover:shadow-lg transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </Link>
        </div>
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
                placeholder="Search by name, email, phone..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select
            placeholder="All Stages"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            options={[
              { value: '', label: 'All Stages' },
              { value: 'applied', label: 'Applied' },
              { value: 'screening', label: 'Screening' },
              { value: 'shortlisted', label: 'Shortlisted' },
              { value: 'interview', label: 'Interview' },
              { value: 'hr_interview', label: 'HR Interview' },
              { value: 'manager_round', label: 'Manager Round' },
              { value: 'offer', label: 'Offer' },
              { value: 'hired', label: 'Hired' },
              { value: 'rejected', label: 'Rejected' }
            ]}
          />
          <Select
            placeholder="All Sources"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            options={[
              { value: '', label: 'All Sources' },
              { value: 'referral', label: 'Referral' },
              { value: 'job_portal', label: 'Job Portal' },
              { value: 'website', label: 'Website' },
              { value: 'walk_in', label: 'Walk-in' },
              { value: 'agency', label: 'Agency' },
              { value: 'linkedin', label: 'LinkedIn' },
              { value: 'naukri', label: 'Naukri' },
              { value: 'indeed', label: 'Indeed' },
              { value: 'other', label: 'Other' }
            ]}
          />
          <Select
            placeholder="All Jobs"
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            options={[
              { value: '', label: 'All Jobs' },
              ...(jobOpenings?.map(job => ({ value: job._id, label: job.title })) || [])
            ]}
          />
        </div>
        {(search || stageFilter || sourceFilter || jobFilter) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch('')
                setStageFilter('')
                setSourceFilter('')
                setJobFilter('')
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
          emptyMessage="No candidates found"
        />
      </div>
    </div>
  )
}

export default Candidates

