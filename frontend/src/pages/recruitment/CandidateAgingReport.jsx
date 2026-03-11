import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { Clock, AlertTriangle, Filter } from 'lucide-react'
import { useState } from 'react'
import Select from '../../components/Select'
import Table from '../../components/Table'
import { Link } from 'react-router-dom'

const CandidateAgingReport = () => {
  const [stageFilter, setStageFilter] = useState('')
  const [jobFilter, setJobFilter] = useState('')

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidatesByStage', stageFilter, jobFilter],
    queryFn: async () => {
      const params = {}
      if (stageFilter) params.stage = stageFilter
      if (jobFilter) params.jobOpening = jobFilter
      
      const response = await api.get('/recruitment/candidates/by-stage', { params })
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

  const getAgingColor = (days) => {
    if (days > 30) return 'text-red-600 font-semibold'
    if (days > 14) return 'text-orange-600 font-medium'
    if (days > 7) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const columns = [
    {
      key: 'name',
      header: 'Candidate',
      render: (value, row) => {
        if (!row || !row._id) return '-'
        return (
          <Link 
            to={`/recruitment/candidates/${row._id}`}
            className="text-primary-600 hover:text-primary-800 font-medium"
          >
            {row.firstName || ''} {row.lastName || ''}
          </Link>
        )
      }
    },
    {
      key: 'email',
      header: 'Email',
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
      key: 'stage',
      header: 'Current Stage',
      render: (value, row) => {
        if (!row) return '-'
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
      key: 'daysInStage',
      header: 'Days in Stage',
      render: (value, row) => {
        if (!row) return '-'
        const days = row.daysInStage || 0
        return (
          <span className={`flex items-center space-x-1 ${getAgingColor(days)}`}>
            {days > 30 && <AlertTriangle className="h-4 w-4" />}
            {days > 14 && days <= 30 && <Clock className="h-4 w-4" />}
            <span>{days} days</span>
          </span>
        )
      }
    },
    {
      key: 'assignedRecruiter',
      header: 'Recruiter',
      render: (value, row) => {
        if (!row) return '-'
        return row.assignedRecruiter?.email || '-'
      }
    }
  ]

  // Filter candidates with aging > 7 days
  const overdueCandidates = candidates?.filter(c => (c.daysInStage || 0) > 7) || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Candidate Aging Report</h1>
        <p className="text-gray-600 mt-1">Track candidates who have been in a stage for extended periods</p>
      </div>

      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              { value: 'offer', label: 'Offer' }
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
          <div className="flex items-center">
            <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Overdue:</strong> {overdueCandidates.length} candidates (&gt;7 days)
              </p>
            </div>
          </div>
        </div>
      </div>

      {overdueCandidates.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">
              Attention Required: {overdueCandidates.length} candidate(s) in stage for more than 7 days
            </h3>
          </div>
          <p className="text-sm text-yellow-700">
            These candidates may need follow-up or stage updates to maintain pipeline flow.
          </p>
        </div>
      )}

      <div className="card">
        <Table
          columns={columns}
          data={candidates || []}
          isLoading={isLoading}
          emptyMessage="No candidates found"
        />
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Color Coding:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><span className="text-red-600 font-semibold">Red (&gt;30 days):</span> Critical - Immediate attention required</li>
          <li><span className="text-orange-600 font-medium">Orange (14-30 days):</span> Warning - Review needed</li>
          <li><span className="text-yellow-600">Yellow (7-14 days):</span> Caution - Monitor closely</li>
          <li><span className="text-gray-600">Gray (&lt;7 days):</span> Normal</li>
        </ul>
      </div>
    </div>
  )
}

export default CandidateAgingReport

