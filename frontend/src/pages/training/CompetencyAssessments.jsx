import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Target, Plus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import { format } from 'date-fns'

const CompetencyAssessments = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [formData, setFormData] = useState({
    employeeId: '',
    competencyMatrixId: '',
    competencyName: '',
    assessmentDate: new Date().toISOString().split('T')[0],
    assessmentMethod: 'practical',
    score: null,
    levelAchieved: '',
    remarks: ''
  })

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get('/employees')
      return response.data.data || []
    },
    enabled: isHR || isAdmin
  })

  const { data: matrices } = useQuery({
    queryKey: ['competency-matrices'],
    queryFn: async () => {
      const response = await api.get('/training/competency-matrices')
      return response.data.data || []
    },
  })

  const { data: assessments, isLoading } = useQuery({
    queryKey: ['competency-assessments', statusFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/training/competency-assessments', { params })
      return response.data.data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return api.post('/training/competency-assessments', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['competency-assessments'])
      setShowModal(false)
      resetForm()
      showToast('Competency assessment created successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create assessment', 'error')
    },
  })

  const resetForm = () => {
    setFormData({
      employeeId: '',
      competencyMatrixId: '',
      competencyName: '',
      assessmentDate: new Date().toISOString().split('T')[0],
      assessmentMethod: 'practical',
      score: null,
      levelAchieved: '',
      remarks: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.employeeId || !formData.competencyMatrixId || !formData.competencyName) {
      showToast('Employee, competency matrix, and competency name are required', 'error')
      return
    }
    createMutation.mutate(formData)
  }

  const getStatusBadge = (status) => {
    const styles = {
      competent: 'bg-green-100 text-green-800',
      not_competent: 'bg-red-100 text-red-800',
      needs_training: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-gray-100 text-gray-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
      </span>
    )
  }

  const selectedMatrix = matrices?.find(m => m._id === formData.competencyMatrixId)
  const availableCompetencies = selectedMatrix?.competencies || []

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Competency Assessments</h1>
          <p className="text-gray-600 mt-1">Track and manage employee competency assessments</p>
        </div>
        {(isHR || isAdmin) && (
          <Button onClick={() => {
            resetForm()
            setShowModal(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Assessment
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <Select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'competent', label: 'Competent' },
            { value: 'not_competent', label: 'Not Competent' },
            { value: 'needs_training', label: 'Needs Training' },
            { value: 'pending', label: 'Pending' }
          ]}
        />
      </div>

      {/* Assessments List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : assessments && assessments.length > 0 ? (
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <div key={assessment._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assessment.competencyName}
                      </h3>
                      {getStatusBadge(assessment.status)}
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Employee:</span> {assessment.employee?.firstName} {assessment.employee?.lastName}
                    </p>

                    {assessment.score !== null && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Score:</span> {assessment.score}%
                      </p>
                    )}

                    {assessment.levelAchieved && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Level Achieved:</span> {assessment.levelAchieved}
                      </p>
                    )}

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Assessment Date:</span> {format(new Date(assessment.assessmentDate), 'MMM dd, yyyy')}
                    </p>

                    {assessment.isExpired && (
                      <div className="mt-2 flex items-center text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        Expired - Requires Re-assessment
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No competency assessments found</h3>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        title="Create Competency Assessment"
        onClose={() => {
          setShowModal(false)
          resetForm()
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {(isHR || isAdmin) && (
            <Select
              label="Employee"
              required
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              options={[
                { value: '', label: 'Select Employee' },
                ...(employees || []).map(emp => ({
                  value: emp._id,
                  label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`
                }))
              ]}
            />
          )}

          <Select
            label="Competency Matrix"
            required
            value={formData.competencyMatrixId}
            onChange={(e) => {
              setFormData({ ...formData, competencyMatrixId: e.target.value, competencyName: '' })
            }}
            options={[
              { value: '', label: 'Select Matrix' },
              ...(matrices || []).map(m => ({
                value: m._id,
                label: m.name
              }))
            ]}
          />

          {formData.competencyMatrixId && (
            <Select
              label="Competency"
              required
              value={formData.competencyName}
              onChange={(e) => setFormData({ ...formData, competencyName: e.target.value })}
              options={[
                { value: '', label: 'Select Competency' },
                ...availableCompetencies.map(c => ({
                  value: c.competencyName,
                  label: c.competencyName
                }))
              ]}
            />
          )}

          <DatePicker
            label="Assessment Date"
            required
            value={formData.assessmentDate}
            onChange={(date) => setFormData({ ...formData, assessmentDate: date })}
          />

          <Select
            label="Assessment Method"
            value={formData.assessmentMethod}
            onChange={(e) => setFormData({ ...formData, assessmentMethod: e.target.value })}
            options={[
              { value: 'written_test', label: 'Written Test' },
              { value: 'practical', label: 'Practical' },
              { value: 'observation', label: 'Observation' },
              { value: 'simulation', label: 'Simulation' },
              { value: 'peer_review', label: 'Peer Review' },
              { value: 'combined', label: 'Combined' }
            ]}
          />

          <Input
            label="Score (%)"
            type="number"
            min="0"
            max="100"
            value={formData.score || ''}
            onChange={(e) => setFormData({ ...formData, score: e.target.value ? parseInt(e.target.value) : null })}
          />

          <Select
            label="Level Achieved"
            value={formData.levelAchieved}
            onChange={(e) => setFormData({ ...formData, levelAchieved: e.target.value })}
            options={[
              { value: '', label: 'Select Level' },
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
              { value: 'expert', label: 'Expert' }
            ]}
          />

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
              Create Assessment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default CompetencyAssessments

