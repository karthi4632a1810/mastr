import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import { useState } from 'react'
import { Shield, CheckCircle, XCircle, AlertCircle, Clock, Ban } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Select from '../../components/Select'
import Input from '../../components/Input'
import DatePicker from '../../components/DatePicker'
import { format } from 'date-fns'

const DoctorPrivileges = () => {
  const { user, isHR, isAdmin } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showSuspendModal, setShowSuspendModal] = useState(null)
  const [showRevokeModal, setShowRevokeModal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [suspendData, setSuspendData] = useState({
    suspendedFrom: new Date().toISOString().split('T')[0],
    suspendedTo: '',
    reason: ''
  })
  const [revokeData, setRevokeData] = useState({
    reason: ''
  })

  const { data: privileges, isLoading } = useQuery({
    queryKey: ['doctor-privileges', statusFilter],
    queryFn: async () => {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const response = await api.get('/privileging/privileges', { params })
      return response.data.data || []
    },
  })

  const suspendMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/privileging/privileges/${id}/suspend`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['doctor-privileges'])
      setShowSuspendModal(null)
      showToast('Privilege suspended successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to suspend privilege', 'error')
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return api.put(`/privileging/privileges/${id}/revoke`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['doctor-privileges'])
      setShowRevokeModal(null)
      showToast('Privilege revoked successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to revoke privilege', 'error')
    },
  })

  const getStatusBadge = (status, isExpired) => {
    if (isExpired) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      )
    }
    const styles = {
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      revoked: 'bg-gray-100 text-gray-800',
      renewed: 'bg-blue-100 text-blue-800'
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    )
  }

  const handleSuspend = () => {
    if (!suspendData.reason) {
      showToast('Reason is required', 'error')
      return
    }
    suspendMutation.mutate({
      id: showSuspendModal._id,
      data: suspendData
    })
  }

  const handleRevoke = () => {
    if (!revokeData.reason) {
      showToast('Reason is required', 'error')
      return
    }
    revokeMutation.mutate({
      id: showRevokeModal._id,
      data: revokeData
    })
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isHR || isAdmin ? 'Doctor Privileges' : 'My Privileges'}
          </h1>
          <p className="text-gray-600 mt-1">View and manage doctor privileges</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <Select
          label="Filter by Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'revoked', label: 'Revoked' }
          ]}
        />
      </div>

      {/* Privileges List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : privileges && privileges.length > 0 ? (
          <div className="space-y-4">
            {privileges.map((privilege) => (
              <div key={privilege._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-5 w-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {privilege.privilegeCategory?.name}
                      </h3>
                      {getStatusBadge(privilege.status, privilege.isExpired)}
                    </div>

                    {isHR || isAdmin ? (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Doctor:</span> {privilege.employee?.firstName} {privilege.employee?.lastName}
                      </p>
                    ) : null}

                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Valid From:</span> {format(new Date(privilege.validFrom), 'MMM dd, yyyy')}
                    </p>

                    {privilege.validTo && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Valid To:</span> {format(new Date(privilege.validTo), 'MMM dd, yyyy')}
                      </p>
                    )}

                    {privilege.renewalDueDate && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Renewal Due:</span> {format(new Date(privilege.renewalDueDate), 'MMM dd, yyyy')}
                      </p>
                    )}

                    {privilege.restrictions && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded">
                        <p className="text-xs font-medium text-yellow-800">Restrictions:</p>
                        <p className="text-xs text-yellow-700">{privilege.restrictions}</p>
                      </div>
                    )}

                    {privilege.suspension?.suspended && (
                      <div className="mt-2 p-2 bg-red-50 rounded">
                        <p className="text-xs font-medium text-red-800">
                          Suspended: {privilege.suspension.reason}
                        </p>
                        <p className="text-xs text-red-700">
                          From {format(new Date(privilege.suspension.suspendedFrom), 'MMM dd, yyyy')}
                          {privilege.suspension.suspendedTo && ` to ${format(new Date(privilege.suspension.suspendedTo), 'MMM dd, yyyy')}`}
                        </p>
                      </div>
                    )}

                    {privilege.revocation?.revoked && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-xs font-medium text-gray-800">
                          Revoked: {privilege.revocation.reason}
                        </p>
                        <p className="text-xs text-gray-700">
                          On {format(new Date(privilege.revocation.revokedAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isAdmin && privilege.status === 'active' && (
                    <div className="ml-4 flex flex-col gap-2">
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => {
                          setShowSuspendModal(privilege)
                          setSuspendData({
                            suspendedFrom: new Date().toISOString().split('T')[0],
                            suspendedTo: '',
                            reason: ''
                          })
                        }}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Suspend
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setShowRevokeModal(privilege)
                          setRevokeData({ reason: '' })
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No privileges found</h3>
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <Modal
          isOpen={!!showSuspendModal}
          title="Suspend Privilege"
          onClose={() => {
            setShowSuspendModal(null)
            setSuspendData({
              suspendedFrom: new Date().toISOString().split('T')[0],
              suspendedTo: '',
              reason: ''
            })
          }}
        >
          <div className="space-y-4">
            <DatePicker
              label="Suspended From"
              required
              value={suspendData.suspendedFrom}
              onChange={(date) => setSuspendData({ ...suspendData, suspendedFrom: date })}
            />

            <DatePicker
              label="Suspended To (Optional)"
              value={suspendData.suspendedTo}
              onChange={(date) => setSuspendData({ ...suspendData, suspendedTo: date || '' })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input"
                required
                value={suspendData.reason}
                onChange={(e) => setSuspendData({ ...suspendData, reason: e.target.value })}
                rows={4}
                placeholder="Reason for suspension"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowSuspendModal(null)
                  setSuspendData({
                    suspendedFrom: new Date().toISOString().split('T')[0],
                    suspendedTo: '',
                    reason: ''
                  })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSuspend}
                isLoading={suspendMutation.isLoading}
                variant="warning"
              >
                Suspend Privilege
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && (
        <Modal
          isOpen={!!showRevokeModal}
          title="Revoke Privilege"
          onClose={() => {
            setShowRevokeModal(null)
            setRevokeData({ reason: '' })
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Revocation <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input"
                required
                value={revokeData.reason}
                onChange={(e) => setRevokeData({ ...revokeData, reason: e.target.value })}
                rows={4}
                placeholder="Provide reason for revoking this privilege"
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action is permanent and cannot be undone. The doctor will need to submit a new privilege request.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowRevokeModal(null)
                  setRevokeData({ reason: '' })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRevoke}
                isLoading={revokeMutation.isLoading}
                variant="danger"
              >
                Revoke Privilege
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default DoctorPrivileges

