import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { 
  Search, Filter, Calendar, FileText, Clock, User, 
  ChevronRight, X, CheckCircle2, XCircle, Clock as ClockIcon,
  AlertCircle, Download, Edit, Trash2, RotateCcw, Eye,
  Calendar as CalendarIcon, DollarSign, Briefcase, Settings
} from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useToast } from '../../contexts/ToastContext'
import moment from 'moment'

const MyRequests = () => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  
  // Filters and search state
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: ''
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [page, setPage] = useState(1)

  // Fetch requests
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-requests', filters, searchQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
        ...(searchQuery && { search: searchQuery })
      })
      const response = await api.get(`/ess/requests?${params}`)
      return response.data
    }
  })

  // Fetch request detail
  const { data: requestDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['request-detail', selectedRequest?.type, selectedRequest?.id],
    queryFn: async () => {
      const response = await api.get(`/ess/requests/${selectedRequest.type}/${selectedRequest.id}`)
      return response.data.data
    },
    enabled: !!selectedRequest && showDetailModal
  })

  // Cancel request mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ type, id }) => {
      const response = await api.put(`/ess/requests/${type}/${id}/cancel`)
      return response.data
    },
    onSuccess: () => {
      showToast('Request cancelled successfully', 'success')
      queryClient.invalidateQueries(['my-requests'])
      setShowDetailModal(false)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to cancel request', 'error')
    }
  })

  // Reopen request mutation
  const reopenMutation = useMutation({
    mutationFn: async ({ type, id }) => {
      const response = await api.put(`/ess/requests/${type}/${id}/reopen`)
      return response.data
    },
    onSuccess: () => {
      showToast('Request re-opened successfully', 'success')
      queryClient.invalidateQueries(['my-requests'])
      setShowDetailModal(false)
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to re-open request', 'error')
    }
  })

  const requests = data?.data || []
  const statusCounts = data?.statusCounts || {}
  const pagination = data?.pagination || {}

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', icon: ClockIcon, label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2, label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Rejected' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, label: 'Cancelled' },
      info_requested: { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle, label: 'Info Requested' },
      paid: { bg: 'bg-purple-100', text: 'text-purple-800', icon: CheckCircle2, label: 'Paid' }
    }
    return badges[status] || badges.pending
  }

  const getTypeIcon = (type) => {
    const icons = {
      leave: CalendarIcon,
      regularization: Clock,
      shift_change: Clock,
      profile_change: User,
      expense: DollarSign
    }
    return icons[type] || FileText
  }

  const getTypeColor = (type) => {
    const colors = {
      leave: 'bg-green-500',
      regularization: 'bg-blue-500',
      shift_change: 'bg-purple-500',
      profile_change: 'bg-orange-500',
      expense: 'bg-teal-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  const handleViewDetail = async (request) => {
    setSelectedRequest({ type: request.type, id: request.id })
    setShowDetailModal(true)
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this request?')) {
      cancelMutation.mutate({ type: selectedRequest.type, id: selectedRequest.id })
    }
  }

  const handleReopen = () => {
    if (window.confirm('Are you sure you want to re-open this request?')) {
      reopenMutation.mutate({ type: selectedRequest.type, id: selectedRequest.id })
    }
  }

  const handleDownloadPDF = () => {
    if (!requestDetail) return
    
    // Create a printable HTML document
    const printWindow = window.open('', '_blank')
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Request Details - ${requestDetail.requestId}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              font-size: 12px; 
              color: #333; 
              padding: 40px;
              line-height: 1.6;
            }
            .header { 
              background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); 
              color: white; 
              padding: 20px; 
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { opacity: 0.9; font-size: 14px; }
            .section { 
              margin-bottom: 25px; 
              padding: 15px; 
              border: 1px solid #e2e8f0; 
              border-radius: 8px;
            }
            .section-title { 
              font-weight: 700; 
              color: #1a365d; 
              margin-bottom: 15px; 
              padding-bottom: 8px; 
              border-bottom: 2px solid #3182ce;
              font-size: 14px;
              text-transform: uppercase;
            }
            .detail-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 0; 
              border-bottom: 1px dotted #e2e8f0; 
            }
            .detail-row:last-child { border-bottom: none; }
            .label { color: #718096; font-weight: 600; }
            .value { color: #2d3748; }
            .status-badge { 
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
            }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-approved { background: #d1fae5; color: #065f46; }
            .status-rejected { background: #fee2e2; color: #991b1b; }
            .status-cancelled { background: #f3f4f6; color: #374151; }
            .timeline { margin-top: 20px; }
            .timeline-item { 
              display: flex; 
              gap: 15px; 
              margin-bottom: 15px;
              padding-left: 20px;
              border-left: 2px solid #3182ce;
            }
            .timeline-dot { 
              width: 12px; 
              height: 12px; 
              background: #3182ce; 
              border-radius: 50%; 
              margin-left: -27px;
              margin-top: 4px;
            }
            .footer { 
              margin-top: 40px; 
              padding-top: 20px; 
              border-top: 1px solid #e2e8f0; 
              text-align: center; 
              color: #718096; 
              font-size: 10px; 
            }
            @media print {
              body { padding: 20px; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>HRMS Request Details</h1>
            <p>Request ID: ${requestDetail.requestId}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Request Information</div>
            <div class="detail-row">
              <span class="label">Title:</span>
              <span class="value">${requestDetail.title}</span>
            </div>
            <div class="detail-row">
              <span class="label">Type:</span>
              <span class="value">${requestDetail.typeLabel}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value">
                <span class="status-badge status-${requestDetail.status}">${getStatusBadge(requestDetail.status).label}</span>
              </span>
            </div>
            <div class="detail-row">
              <span class="label">Submitted:</span>
              <span class="value">${moment(requestDetail.submissionDate).format('MMM D, YYYY h:mm A')}</span>
            </div>
            ${requestDetail.resolutionDate ? `
            <div class="detail-row">
              <span class="label">Resolved:</span>
              <span class="value">${moment(requestDetail.resolutionDate).format('MMM D, YYYY h:mm A')}</span>
            </div>
            ` : ''}
            ${requestDetail.approver ? `
            <div class="detail-row">
              <span class="label">Approver:</span>
              <span class="value">${requestDetail.approver}</span>
            </div>
            ` : ''}
          </div>
          
          ${Object.keys(requestDetail.details || {}).length > 0 ? `
          <div class="section">
            <div class="section-title">Request Details</div>
            ${Object.entries(requestDetail.details).map(([key, value]) => {
              if (value === null || value === undefined || value === '') return ''
              let displayValue = value
              if (moment.isMoment(value) || value instanceof Date) {
                displayValue = moment(value).format('MMM D, YYYY h:mm A')
              } else if (typeof value === 'object' && !Array.isArray(value)) {
                displayValue = JSON.stringify(value, null, 2)
              } else if (Array.isArray(value)) {
                displayValue = value.length > 0 ? value.join(', ') : 'None'
              }
              return `
                <div class="detail-row">
                  <span class="label">${key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                  <span class="value">${String(displayValue)}</span>
                </div>
              `
            }).join('')}
          </div>
          ` : ''}
          
          ${requestDetail.timeline && requestDetail.timeline.length > 0 ? `
          <div class="section">
            <div class="section-title">Timeline</div>
            <div class="timeline">
              ${requestDetail.timeline.map((event, index) => `
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div>
                    <div style="font-weight: 600; color: #2d3748; margin-bottom: 4px;">${event.action}</div>
                    <div style="font-size: 11px; color: #718096;">
                      ${moment(event.date).format('MMM D, YYYY h:mm A')}
                      ${event.by ? ` • ${typeof event.by === 'object' ? (event.by.email || `${event.by.firstName || ''} ${event.by.lastName || ''}`.trim()) : event.by}` : ''}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>Generated on ${moment().format('MMM D, YYYY h:mm A')}</p>
            <p style="margin-top: 5px;">This is a system-generated document.</p>
          </div>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const clearFilters = () => {
    setFilters({ type: '', status: '', startDate: '', endDate: '' })
    setSearchQuery('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Requests</h1>
          <p className="text-gray-600 mt-1">Track and manage all your HR requests</p>
        </div>
        <Button onClick={refetch} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusCard 
          label="All" 
          count={statusCounts.all || 0} 
          active={!filters.status}
          onClick={() => setFilters({ ...filters, status: '' })}
        />
        <StatusCard 
          label="Pending" 
          count={statusCounts.pending || 0} 
          active={filters.status === 'pending'}
          onClick={() => setFilters({ ...filters, status: 'pending' })}
          color="amber"
        />
        <StatusCard 
          label="Approved" 
          count={statusCounts.approved || 0} 
          active={filters.status === 'approved'}
          onClick={() => setFilters({ ...filters, status: 'approved' })}
          color="green"
        />
        <StatusCard 
          label="Rejected" 
          count={statusCounts.rejected || 0} 
          active={filters.status === 'rejected'}
          onClick={() => setFilters({ ...filters, status: 'rejected' })}
          color="red"
        />
        <StatusCard 
          label="Cancelled" 
          count={statusCounts.cancelled || 0} 
          active={filters.status === 'cancelled'}
          onClick={() => setFilters({ ...filters, status: 'cancelled' })}
          color="gray"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by request ID, type, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => {
              setFilters({ ...filters, type: e.target.value })
              setPage(1)
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="leave">Leave Request</option>
            <option value="regularization">Attendance Regularization</option>
            <option value="shift_change">Shift Change</option>
            <option value="profile_change">Profile Update</option>
            <option value="expense">Expense Claim</option>
          </select>

          {/* Date Range */}
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value })
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="From"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value })
                setPage(1)
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="To"
            />
          </div>

          {/* Clear Filters */}
          {(filters.type || filters.status || filters.startDate || filters.endDate || searchQuery) && (
            <Button variant="outline" onClick={clearFilters} size="sm">
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
          <p className="text-red-600">Failed to load requests. Please try again.</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No requests found</h3>
          <p className="text-gray-500">You haven't submitted any requests yet, or no requests match your filters.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {requests.map((request) => {
                const statusBadge = getStatusBadge(request.status)
                const StatusIcon = statusBadge.icon
                const TypeIcon = getTypeIcon(request.type)

                return (
                  <div
                    key={request.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => handleViewDetail(request)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Type Icon */}
                        <div className={`${getTypeColor(request.type)} p-3 rounded-xl text-white`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>

                        {/* Request Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{request.title}</h3>
                            <span className="text-sm text-gray-500 font-mono">{request.requestId}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{request.typeLabel}</p>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {moment(request.submissionDate).format('MMM D, YYYY')}
                            </span>
                            {request.approver && (
                              <span className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {request.approver}
                              </span>
                            )}
                            {request.resolutionDate && (
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-4 h-4" />
                                Resolved: {moment(request.resolutionDate).format('MMM D, YYYY')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="flex items-center gap-3">
                        <span className={`${statusBadge.bg} ${statusBadge.text} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5`}>
                          <StatusIcon className="w-4 h-4" />
                          {statusBadge.label}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Request Detail Modal */}
      {showDetailModal && (
        <RequestDetailModal
          request={requestDetail}
          loading={loadingDetail}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedRequest(null)
          }}
          onCancel={handleCancel}
          onReopen={handleReopen}
          onDownload={handleDownloadPDF}
          canCancel={requestDetail?.canCancel}
          canReopen={requestDetail?.canReopen}
          cancelling={cancelMutation.isPending}
          reopening={reopenMutation.isPending}
        />
      )}
    </div>
  )
}

const StatusCard = ({ label, count, active, onClick, color = 'indigo' }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700'
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
        active 
          ? `${colorClasses[color]} border-opacity-100` 
          : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="text-2xl font-bold mb-1">{count}</div>
      <div className="text-sm font-medium">{label}</div>
    </div>
  )
}

const RequestDetailModal = ({ 
  request, 
  loading, 
  onClose, 
  onCancel, 
  onReopen, 
  onDownload,
  canCancel,
  canReopen,
  cancelling,
  reopening
}) => {
  if (loading) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Request Details">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Modal>
    )
  }

  if (!request) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Request Details">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
          <p className="text-gray-600">Failed to load request details</p>
        </div>
      </Modal>
    )
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
      info_requested: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Info Requested' }
    }
    return badges[status] || badges.pending
  }

  const statusBadge = getStatusBadge(request.status)

  return (
    <Modal isOpen={true} onClose={onClose} title="" size="large">
      <div className="space-y-0">
        {/* Professional Header Banner */}
        <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">HRMS Request Details</h1>
              <p className="text-primary-100 text-sm font-mono">Request ID: {request.requestId}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onDownload}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
              {canCancel && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onCancel} 
                  disabled={cancelling}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              )}
              {canReopen && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onReopen} 
                  disabled={reopening}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Re-open
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* REQUEST INFORMATION Section */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
            Request Information
          </h2>
          <div className="bg-white space-y-0">
            <DetailRow label="Title" value={request.title || 'N/A'} />
            <DetailRow label="Type" value={request.typeLabel || 'N/A'} />
            <DetailRow 
              label="Status" 
              value={
                <span className={`${statusBadge.bg} ${statusBadge.text} px-3 py-1 rounded-full text-sm font-medium inline-block`}>
                  {statusBadge.label}
                </span>
              } 
            />
            <DetailRow label="Submitted" value={moment(request.submissionDate).format('MMM D, YYYY h:mm A')} />
            {request.resolutionDate && (
              <DetailRow label="Resolved" value={moment(request.resolutionDate).format('MMM D, YYYY h:mm A')} />
            )}
            {request.approver && (
              <DetailRow label="Approver" value={request.approver} />
            )}
          </div>
        </div>

        {/* REQUEST DETAILS Section */}
        {Object.keys(request.details || {}).length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
              Request Details
            </h2>
            <div className="bg-white space-y-0">
              {Object.entries(request.details || {}).map(([key, value]) => {
                if (value === null || value === undefined || value === '') return null
                
                let displayValue = value
                if (moment.isMoment(value) || value instanceof Date) {
                  displayValue = moment(value).format('MMM D, YYYY h:mm A')
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                  displayValue = JSON.stringify(value, null, 2)
                } else if (Array.isArray(value)) {
                  displayValue = value.length > 0 ? value.join(', ') : 'None'
                } else if (typeof value === 'boolean') {
                  displayValue = value ? 'Yes' : 'No'
                }

                return (
                  <DetailRow 
                    key={key} 
                    label={key.replace(/([A-Z])/g, ' $1').trim().replace(/^\w/, c => c.toUpperCase())} 
                    value={String(displayValue)} 
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {request.timeline && request.timeline.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
              Timeline
            </h2>
            <div className="bg-white space-y-0">
              {request.timeline.map((event, index) => (
                <div key={index} className="flex gap-4 py-3 px-1 border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col items-center pt-1">
                    <div className="w-3 h-3 bg-primary-600 rounded-full ring-2 ring-primary-200"></div>
                    {index < request.timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-2 min-h-[40px]"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">{event.action}</div>
                    <div className="text-sm text-gray-600">
                      {moment(event.date).format('MMM D, YYYY h:mm A')}
                      {event.by && ` • ${typeof event.by === 'object' ? event.by.email || `${event.by.firstName || ''} ${event.by.lastName || ''}`.trim() : event.by}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        {request.attachments && request.attachments.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
              Attachments
            </h2>
            <div className="bg-white space-y-2">
              {request.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-primary-50 hover:border-primary-200 border border-gray-200 transition-all group"
                >
                  <FileText className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">{attachment.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-3 px-1 border-b border-gray-200 hover:bg-gray-50 transition-colors">
    <span className="text-gray-600 font-medium text-sm">{label}:</span>
    <span className="text-gray-900 font-semibold text-right max-w-md">{value}</span>
  </div>
)

export default MyRequests

