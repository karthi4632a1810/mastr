import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useState, useMemo } from 'react';
import { 
  Clock, 
  User, 
  Camera, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  Filter,
  Download,
  MapPin,
  Shield,
  Search
} from 'lucide-react';
import Button from '../../components/Button';
import Table from '../../components/Table';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const FaceAttendanceLogs = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHR = user?.role === 'hr' || user?.role === 'admin';
  
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    employeeId: '',
    minMatchScore: '',
    maxMatchScore: '',
    status: '',
    cameraLocation: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['face-attendance-logs', filters, page, isHR],
    queryFn: async () => {
      const endpoint = isHR ? '/face-attendance-logs' : '/face-attendance-logs/my';
      const response = await api.get(endpoint, { params: { ...filters, page, limit } });
      return response.data;
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load face attendance logs', 'error');
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['face-attendance-stats', filters],
    queryFn: async () => {
      const response = await api.get('/face-attendance-logs/stats', { 
        params: { startDate: filters.startDate, endDate: filters.endDate } 
      });
      return response.data.data;
    },
    enabled: isHR
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const response = await api.put(`/face-attendance-logs/${id}/review`, { status, notes });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['face-attendance-logs']);
      showToast('Review status updated successfully', 'success');
      setReviewModal(false);
      setSelectedLog(null);
      setReviewStatus('');
      setReviewNotes('');
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to update review status', 'error');
    }
  });

  const handleReview = (log) => {
    setSelectedLog(log);
    setReviewStatus(log.hrReview?.status || '');
    setReviewNotes(log.hrReview?.notes || '');
    setReviewModal(true);
  };

  const handleSubmitReview = () => {
    if (!reviewStatus) {
      showToast('Please select a review status', 'error');
      return;
    }
    reviewMutation.mutate({
      id: selectedLog._id,
      status: reviewStatus,
      notes: reviewNotes
    });
  };

  const getStatusBadge = (status, matched) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </span>
      );
    }
    if (status === 'suspicious') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Suspicious
        </span>
      );
    }
    if (status === 'needs_followup') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Needs Follow-up
        </span>
      );
    }
    if (matched) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Success
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </span>
    );
  };

  const getMatchScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600 font-semibold';
    if (score >= 0.6) return 'text-blue-600';
    return 'text-yellow-600';
  };

  const columns = isHR ? [
    {
      header: 'Employee',
      accessor: 'employee',
      cell: (row) => (
        <div>
          <div className="font-medium">{row.employee?.firstName} {row.employee?.lastName}</div>
          <div className="text-xs text-gray-500">{row.employee?.employeeId}</div>
        </div>
      )
    },
    {
      header: 'Date & Time',
      accessor: 'punch.time',
      cell: (row) => (
        <div>
          <div>{new Date(row.punch.time).toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">
            {new Date(row.punch.time).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'punch.type',
      cell: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.punch.type === 'punch_in' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {row.punch.type === 'punch_in' ? 'Punch In' : 'Punch Out'}
        </span>
      )
    },
    {
      header: 'Match Score',
      accessor: 'faceMatch.matchScore',
      cell: (row) => (
        <div className={getMatchScoreColor(row.faceMatch?.matchScore || 0)}>
          {((row.faceMatch?.matchScore || 0) * 100).toFixed(1)}%
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'verificationStatus',
      cell: (row) => getStatusBadge(row.verificationStatus, row.faceMatch?.matched)
    },
    {
      header: 'Camera',
      accessor: 'camera',
      cell: (row) => (
        <div>
          {row.camera?.cameraName ? (
            <>
              <div className="text-sm font-medium">{row.camera.cameraName}</div>
              {row.camera.locationTag && (
                <div className="text-xs text-gray-500">{row.camera.locationTag}</div>
              )}
            </>
          ) : (
            <span className="text-gray-400">N/A</span>
          )}
        </div>
      )
    },
    {
      header: 'Image',
      accessor: 'image',
      cell: (row) => (
        row.image?.thumbnailUrl ? (
          <button
            onClick={() => setSelectedLog(row)}
            className="w-16 h-16 rounded border border-gray-300 overflow-hidden hover:border-blue-500 transition-colors"
          >
            <img 
              src={row.image.thumbnailUrl} 
              alt="Face capture" 
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <span className="text-gray-400 text-xs">No image</span>
        )
      )
    },
    {
      header: 'Device/IP',
      accessor: 'device',
      cell: (row) => (
        <div className="text-xs">
          <div>{row.device?.ipAddress || 'N/A'}</div>
          <div className="text-gray-500 truncate max-w-xs">
            {row.device?.userAgent || 'N/A'}
          </div>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleReview(row)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Review"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ] : [
    {
      header: 'Date & Time',
      accessor: 'punch.time',
      cell: (row) => (
        <div>
          <div>{new Date(row.punch.time).toLocaleDateString()}</div>
          <div className="text-xs text-gray-500">
            {new Date(row.punch.time).toLocaleTimeString()}
          </div>
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'punch.type',
      cell: (row) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          row.punch.type === 'punch_in' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-purple-100 text-purple-800'
        }`}>
          {row.punch.type === 'punch_in' ? 'Punch In' : 'Punch Out'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'verificationStatus',
      cell: (row) => getStatusBadge(row.verificationStatus, row.faceMatch?.matched)
    },
    {
      header: 'Method',
      accessor: 'method',
      cell: (row) => (
        <span className="text-sm text-gray-700">
          {row.method === 'face_auto' ? 'Face (Auto)' : 
           row.method === 'face_manual' ? 'Face (Manual)' : 
           row.method || 'Manual'}
        </span>
      )
    },
    {
      header: 'Match Confirmation',
      accessor: 'faceMatch',
      cell: (row) => (
        <div>
          {row.faceMatch?.matched ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">Verified</span>
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <XCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">Not Verified</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Location',
      accessor: 'location',
      cell: (row) => (
        row.location?.address ? (
          <div className="text-xs">
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {row.location.address}
            </div>
          </div>
        ) : (
          <span className="text-gray-400 text-xs">N/A</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Face Attendance Logs</h1>
          <p className="text-gray-600 mt-1">
            {isHR ? 'View and manage all face attendance verification logs' : 'View your face attendance verification history'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          {isHR && (
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Statistics (HR only) */}
      {isHR && stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Total Logs</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Success</div>
            <div className="text-2xl font-bold text-green-600">{stats.success || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Suspicious</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.suspicious || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-600">Avg Match Score</div>
            <div className="text-2xl font-bold text-blue-600">
              {((stats.avgMatchScore || 0) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
            {isHR && (
              <Input
                label="Employee ID"
                value={filters.employeeId}
                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                placeholder="Search by Employee ID"
              />
            )}
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'success', label: 'Success' },
                { value: 'failed', label: 'Failed' },
                { value: 'verified', label: 'Verified' },
                { value: 'suspicious', label: 'Suspicious' },
                { value: 'needs_followup', label: 'Needs Follow-up' }
              ]}
            />
            {isHR && (
              <>
                <Input
                  label="Min Match Score"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={filters.minMatchScore}
                  onChange={(e) => setFilters({ ...filters, minMatchScore: e.target.value })}
                  placeholder="0.0"
                />
                <Input
                  label="Max Match Score"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={filters.maxMatchScore}
                  onChange={(e) => setFilters({ ...filters, maxMatchScore: e.target.value })}
                  placeholder="1.0"
                />
              </>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  employeeId: '',
                  minMatchScore: '',
                  maxMatchScore: '',
                  status: '',
                  cameraLocation: ''
                });
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow">
        {isLoading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading face attendance logs..." />
          </div>
        ) : error ? (
          <div className="py-12">
            <EmptyState
              icon={Camera}
              title="Error loading logs"
              message={error.response?.data?.message || 'Failed to load face attendance logs. Please try again.'}
            />
          </div>
        ) : (
          <Table
            data={logs?.data || []}
            columns={columns}
            isLoading={false}
            emptyMessage="No face attendance logs found"
          />
        )}
        
        {/* Pagination */}
        {logs && logs.totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, logs.total)} of {logs.total} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {page} of {logs.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(logs.totalPages, p + 1))}
                disabled={page === logs.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image View Modal */}
      {selectedLog && selectedLog.image?.snapshotUrl && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title="Face Capture Image"
          size="lg"
        >
          <div className="space-y-4">
            <img 
              src={selectedLog.image.snapshotUrl} 
              alt="Face capture" 
              className="w-full rounded-lg"
            />
            <div className="text-sm text-gray-600">
              <div><strong>Employee:</strong> {selectedLog.employee?.firstName} {selectedLog.employee?.lastName}</div>
              <div><strong>Time:</strong> {new Date(selectedLog.punch.time).toLocaleString()}</div>
              <div><strong>Match Score:</strong> {((selectedLog.faceMatch?.matchScore || 0) * 100).toFixed(1)}%</div>
            </div>
          </div>
        </Modal>
      )}

      {/* Review Modal (HR only) */}
      {isHR && (
        <Modal
          isOpen={reviewModal}
          onClose={() => {
            setReviewModal(false);
            setSelectedLog(null);
            setReviewStatus('');
            setReviewNotes('');
          }}
          title="Review Face Attendance Log"
        >
          <div className="space-y-4">
            {selectedLog && (
              <div className="text-sm text-gray-600 space-y-2">
                <div><strong>Employee:</strong> {selectedLog.employee?.firstName} {selectedLog.employee?.lastName}</div>
                <div><strong>Date & Time:</strong> {new Date(selectedLog.punch.time).toLocaleString()}</div>
                <div><strong>Match Score:</strong> {((selectedLog.faceMatch?.matchScore || 0) * 100).toFixed(1)}%</div>
              </div>
            )}
            
            <Select
              label="Review Status"
              value={reviewStatus}
              onChange={(e) => setReviewStatus(e.target.value)}
              options={[
                { value: '', label: 'Select status' },
                { value: 'verified', label: 'Verified' },
                { value: 'suspicious', label: 'Suspicious' },
                { value: 'needs_followup', label: 'Needs Follow-up' }
              ]}
              required
            />
            
            <Input
              label="Notes (Optional)"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              multiline
              rows={4}
              placeholder="Add any notes or observations..."
            />
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setReviewModal(false);
                  setSelectedLog(null);
                  setReviewStatus('');
                  setReviewNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={reviewMutation.isLoading || !reviewStatus}
              >
                {reviewMutation.isLoading ? 'Updating...' : 'Update Review'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FaceAttendanceLogs;

