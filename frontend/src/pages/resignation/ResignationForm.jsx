import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../contexts/ToastContext'
import { Calendar, FileText, AlertCircle, Info, Upload, X } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'

const ResignationForm = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    tentativeLastWorkingDate: '',
    reason: '',
    reasonText: '',
    additionalComments: ''
  })
  const [documents, setDocuments] = useState([])
  const [policyData, setPolicyData] = useState(null)

  // Get notice period policy
  const { data: policy } = useQuery({
    queryKey: ['noticePeriodPolicy'],
    queryFn: async () => {
      const response = await api.get('/resignations/me/policy')
      return response.data.data
    },
    onSuccess: (data) => {
      setPolicyData(data)
    }
  })

  // Check if employee already has a resignation
  const { data: existingResignation } = useQuery({
    queryKey: ['myResignation'],
    queryFn: async () => {
      try {
        const response = await api.get('/resignations/me')
        return response.data.data
      } catch (error) {
        if (error.response?.status === 404) {
          return null
        }
        throw error
      }
    }
  })

  const submitMutation = useMutation({
    mutationFn: async (formDataToSubmit) => {
      const formDataObj = new FormData()
      formDataObj.append('tentativeLastWorkingDate', formDataToSubmit.tentativeLastWorkingDate)
      formDataObj.append('reason', formDataToSubmit.reason)
      formDataObj.append('reasonText', formDataToSubmit.reasonText || '')
      formDataObj.append('additionalComments', formDataToSubmit.additionalComments || '')
      
      documents.forEach((file) => {
        formDataObj.append('documents', file)
      })

      const response = await api.post('/resignations/me/submit', formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myResignation'])
      showToast('Resignation submitted successfully', 'success')
      navigate('/resignation/my-resignation')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to submit resignation', 'error')
    }
  })

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      const maxSize = 5 * 1024 * 1024 // 5MB
      
      if (!validTypes.includes(file.type)) {
        showToast(`${file.name} is not a valid file type`, 'error')
        return false
      }
      if (file.size > maxSize) {
        showToast(`${file.name} exceeds 5MB size limit`, 'error')
        return false
      }
      return true
    })

    setDocuments([...documents, ...validFiles])
  }

  const removeDocument = (index) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.tentativeLastWorkingDate || !formData.reason) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    submitMutation.mutate(formData)
  }

  const calculateNoticePeriodEndDate = () => {
    if (!formData.tentativeLastWorkingDate || !policyData) return null
    
    const tlwd = new Date(formData.tentativeLastWorkingDate)
    const today = new Date()
    const daysDiff = Math.ceil((tlwd - today) / (1000 * 60 * 60 * 24))
    
    if (daysDiff < policyData.noticePeriodDays) {
      return null // Invalid
    }
    
    const noticeEndDate = new Date(today)
    noticeEndDate.setDate(noticeEndDate.getDate() + policyData.noticePeriodDays)
    return noticeEndDate
  }

  const noticePeriodEndDate = calculateNoticePeriodEndDate()

  if (existingResignation && existingResignation.status !== 'withdrawn') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Resignation Already Submitted</h2>
        <p className="text-gray-600 mb-4">
          You have already submitted a resignation. Please view your resignation status or withdraw it first.
        </p>
        <Button onClick={() => navigate('/resignation/my-resignation')}>
          View My Resignation
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Submit Resignation</h1>
        <p className="text-gray-600 mt-1">Submit your resignation to begin the exit process</p>
      </div>

      {/* Notice Period Policy */}
      {policyData && (
        <div className="card mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Notice Period Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Required Notice Period:</span>
                  <span className="text-blue-900 ml-2">{policyData.noticePeriodDays} days</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Minimum Service Period:</span>
                  <span className="text-blue-900 ml-2">{policyData.minimumServiceDays} days</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Your Service:</span>
                  <span className={`ml-2 font-medium ${policyData.minimumServicePeriodMet ? 'text-green-700' : 'text-red-700'}`}>
                    {policyData.currentServiceDays} days
                    {policyData.minimumServicePeriodMet ? ' ✓' : ' ✗'}
                  </span>
                </div>
              </div>
              {!policyData.minimumServicePeriodMet && (
                <div className="mt-2 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  You have not completed the minimum service period. Please contact HR.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Resignation Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tentative Last Working Date (TLWD) <span className="text-red-600">*</span>
              </label>
              <Input
                type="date"
                value={formData.tentativeLastWorkingDate}
                onChange={(e) => setFormData({ ...formData, tentativeLastWorkingDate: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
              />
              {formData.tentativeLastWorkingDate && noticePeriodEndDate && (
                <p className="mt-2 text-sm text-gray-600">
                  Notice period will end on: <strong>{noticePeriodEndDate.toLocaleDateString()}</strong>
                </p>
              )}
              {formData.tentativeLastWorkingDate && !noticePeriodEndDate && policyData && (
                <p className="mt-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Selected date does not meet the minimum notice period requirement ({policyData.noticePeriodDays} days)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Resignation <span className="text-red-600">*</span>
              </label>
              <Select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                options={[
                  { value: '', label: 'Select a reason...' },
                  { value: 'better_opportunity', label: 'Better Opportunity' },
                  { value: 'personal_reasons', label: 'Personal Reasons' },
                  { value: 'relocation', label: 'Relocation' },
                  { value: 'health_issues', label: 'Health Issues' },
                  { value: 'career_change', label: 'Career Change' },
                  { value: 'dissatisfaction', label: 'Dissatisfaction' },
                  { value: 'retirement', label: 'Retirement' },
                  { value: 'other', label: 'Other' }
                ]}
              />
            </div>

            {formData.reason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  value={formData.reasonText}
                  onChange={(e) => setFormData({ ...formData, reasonText: e.target.value })}
                  rows={3}
                  className="input"
                  placeholder="Provide additional details about your reason for resignation..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={formData.additionalComments}
                onChange={(e) => setFormData({ ...formData, additionalComments: e.target.value })}
                rows={4}
                className="input"
                placeholder="Any additional comments or information..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supporting Documents (Optional)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                      <span>Upload files</span>
                      <input
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF, DOC, DOCX, JPG, PNG up to 5MB each</p>
                </div>
              </div>
              
              {documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {documents.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-700">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={submitMutation.isLoading}
            disabled={!formData.tentativeLastWorkingDate || !formData.reason || (policyData && !policyData.minimumServicePeriodMet)}
          >
            Submit Resignation
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ResignationForm

