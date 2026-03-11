import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { useState, useEffect } from 'react'
import { Plus, MapPin, Edit, Trash2, Shield, AlertTriangle, CheckCircle, XCircle, Clock, FileText } from 'lucide-react'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import Table from '../../components/Table'
import ConfirmDialog from '../../components/ConfirmDialog'
import MapSelector from '../../components/MapSelector'

const GeoFences = () => {
  const { showToast } = useToast()
  const { isAdmin, isHR } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('fences')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [selectedViolation, setSelectedViolation] = useState(null)
  const [showViolationModal, setShowViolationModal] = useState(false)
  const [mapLocation, setMapLocation] = useState({
    latitude: null,
    longitude: null,
    address: ''
  })
  const [mapRadius, setMapRadius] = useState(100)

  const { data: fences, isLoading: fencesLoading } = useQuery({
    queryKey: ['geofences'],
    queryFn: async () => {
      const response = await api.get('/geofences')
      return response.data
    },
    enabled: isAdmin || isHR
  })

  const { data: violations, isLoading: violationsLoading } = useQuery({
    queryKey: ['geofence-violations'],
    queryFn: async () => {
      const response = await api.get('/geofences/violations')
      return response.data
    },
    enabled: isAdmin || isHR
  })

  const { data: reports } = useQuery({
    queryKey: ['geofence-reports'],
    queryFn: async () => {
      const response = await api.get('/geofences/reports')
      return response.data
    },
    enabled: isAdmin || isHR
  })

  const fenceMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return api.put(`/geofences/${editingItem._id}`, data)
      } else {
        return api.post('/geofences', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['geofences'])
      setShowModal(false)
      setEditingItem(null)
      showToast(editingItem ? 'Geo-fence updated' : 'Geo-fence created', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Operation failed', 'error')
    },
  })

  const deleteFenceMutation = useMutation({
    mutationFn: async (id) => api.delete(`/geofences/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['geofences'])
      setDeleteItem(null)
      showToast('Geo-fence deleted successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to delete geo-fence', 'error')
    },
  })

  const reviewViolationMutation = useMutation({
    mutationFn: async ({ id, status, comments }) => {
      return api.put(`/geofences/violations/${id}/review`, { status, comments })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['geofence-violations'])
      setShowViolationModal(false)
      setSelectedViolation(null)
      showToast('Violation reviewed successfully', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to review violation', 'error')
    },
  })

  // Initialize map location when editing
  useEffect(() => {
    if (editingItem && showModal) {
      setMapLocation({
        latitude: editingItem.location?.latitude || null,
        longitude: editingItem.location?.longitude || null,
        address: editingItem.location?.address || ''
      })
      setMapRadius(editingItem.radius || 100)
    } else if (!editingItem && showModal) {
      // Reset for new fence
      setMapLocation({ latitude: null, longitude: null, address: '' })
      setMapRadius(100)
    }
  }, [editingItem, showModal])

  const handleLocationChange = (lat, lng, addr = '') => {
    setMapLocation({
      latitude: lat,
      longitude: lng,
      address: addr
    })
  }

  const handleRadiusChange = (radius) => {
    setMapRadius(radius)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!mapLocation.latitude || !mapLocation.longitude) {
      showToast('Please select a location on the map or use GPS', 'error')
      return
    }

    const formData = new FormData(e.target)
    const data = {
      name: formData.get('name'),
      type: formData.get('type'),
      location: {
        latitude: mapLocation.latitude,
        longitude: mapLocation.longitude,
        address: mapLocation.address || formData.get('address') || ''
      },
      radius: mapRadius,
      deviceRestriction: formData.get('deviceRestriction') || 'any_device',
      enforcement: {
        enabled: formData.get('enforcementEnabled') === 'true',
        applyTo: formData.get('applyTo') || 'all',
        departments: formData.get('departments') ? formData.get('departments').split(',').filter(Boolean) : [],
        roles: formData.get('roles') ? formData.get('roles').split(',') : []
      },
      overrideRules: {
        allowOutsidePunch: formData.get('allowOutsidePunch') === 'true',
        requireHRApproval: formData.get('requireHRApproval') === 'true'
      },
      isActive: formData.get('isActive') === 'true'
    }
    fenceMutation.mutate(data)
  }

  const tabs = [
    { id: 'fences', name: 'Geo-Fences', icon: MapPin },
    { id: 'violations', name: 'Violations', icon: AlertTriangle },
    { id: 'reports', name: 'Reports', icon: FileText }
  ]

  const renderFencesTable = () => {
    const columns = [
      { key: 'name', header: 'Name' },
      {
        key: 'type',
        header: 'Type',
        render: (value, row) => {
          if (!row) return '-'
          return (
            <span className="capitalize text-sm">
              {row.type?.replace('_', ' ') || '-'}
            </span>
          )
        }
      },
      {
        key: 'location',
        header: 'Location',
        render: (value, row) => {
          if (!row || !row.location) return '-'
          return (
            <div className="text-sm">
              <div>
                {row.location?.latitude != null && row.location?.longitude != null
                  ? `${Number(row.location.latitude).toFixed(6)}, ${Number(row.location.longitude).toFixed(6)}`
                  : '-'}
              </div>
              {row.location?.address && (
                <div className="text-gray-500 text-xs">{row.location.address}</div>
              )}
            </div>
          )
        }
      },
      {
        key: 'radius',
        header: 'Radius',
        render: (value, row) => {
          if (!row || row.radius == null) return '-'
          return `${row.radius}m`
        }
      },
      {
        key: 'status',
        header: 'Status',
        render: (value, row) => {
          if (!row) return '-'
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {row.isActive ? 'Active' : 'Inactive'}
            </span>
          )
        }
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (value, row) => {
          if (!row) return '-'
          return (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setEditingItem(row)
                  setShowModal(true)
                }}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </button>
              <button
                onClick={() => setDeleteItem(row)}
                className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          )
        }
      }
    ]
    return <Table columns={columns} data={fences?.data || []} isLoading={fencesLoading} />
  }

  const renderViolationsTable = () => {
    const columns = [
      {
        key: 'employee',
        header: 'Employee',
        render: (value, row) => {
          if (!row || !row.employee) return '-'
          return (
            <div>
              {row.employee?.firstName || ''} {row.employee?.lastName || ''}
              <div className="text-xs text-gray-500">{row.employee?.employeeId || '-'}</div>
            </div>
          )
        }
      },
      {
        key: 'geoFence',
        header: 'Geo-Fence',
        render: (value, row) => {
          if (!row) return '-'
          return row.geoFence?.name || '-'
        }
      },
      {
        key: 'distance',
        header: 'Distance',
        render: (value, row) => {
          if (!row || row.distance == null) return '-'
          return `${row.distance}m`
        }
      },
      {
        key: 'punch',
        header: 'Punch',
        render: (value, row) => {
          if (!row || !row.punch) return '-'
          return (
            <div className="text-sm">
              <div className="capitalize">{row.punch?.type?.replace('_', ' ') || '-'}</div>
              {row.punch?.time && (
                <div className="text-xs text-gray-500">
                  {new Date(row.punch.time).toLocaleString()}
                </div>
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
          const statusConfig = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
            approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
            rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
            auto_approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
          }
          const config = statusConfig[row.status] || statusConfig.pending
          const Icon = config.icon
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center ${config.color}`}>
              <Icon className="h-3 w-3 mr-1" />
              {row.status ? row.status.replace('_', ' ').toUpperCase() : 'PENDING'}
            </span>
          )
        }
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (value, row) => {
          if (!row) return '-'
          return row.status === 'pending' ? (
            <button
              onClick={() => {
                setSelectedViolation(row)
                setShowViolationModal(true)
              }}
              className="text-primary-600 hover:text-primary-800 text-sm font-medium"
            >
              Review
            </button>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )
        }
      }
    ]
    return <Table columns={columns} data={violations?.data || []} isLoading={violationsLoading} />
  }

  const renderReports = () => {
    if (!reports?.data) return <div>Loading reports...</div>

    const { summary, distanceDeviations, violations: reportViolations } = reports.data

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="text-sm text-gray-600">Inside Fence</div>
            <div className="text-2xl font-bold text-green-600">{summary?.insidePunches || 0}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-600">Outside Fence</div>
            <div className="text-2xl font-bold text-red-600">{summary?.outsidePunches || 0}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-600">Total Violations</div>
            <div className="text-2xl font-bold text-yellow-600">{summary?.totalViolations || 0}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-gray-600">Pending Approvals</div>
            <div className="text-2xl font-bold text-orange-600">{summary?.pendingApprovals || 0}</div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Violations</h3>
          <Table
            columns={[
              { key: 'employee', header: 'Employee' },
              { key: 'distance', header: 'Distance (m)' },
              { key: 'status', header: 'Status' }
            ]}
            data={reportViolations?.slice(0, 10) || []}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Geo-Fence Management</h1>
          <p className="text-gray-600 mt-1">Configure and manage attendance geo-fences</p>
        </div>
        {activeTab === 'fences' && (
          <Button onClick={() => { setEditingItem(null); setShowModal(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Geo-Fence
          </Button>
        )}
      </div>

      <div className="card">
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {activeTab === 'fences' && renderFencesTable()}
        {activeTab === 'violations' && renderViolationsTable()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {/* Create/Edit Geo-Fence Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingItem(null) }}
        title={`${editingItem ? 'Edit' : 'Create'} Geo-Fence`}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              required
              defaultValue={editingItem?.name || ''}
              placeholder="e.g., Main Office"
            />
            <Select
              label="Type"
              name="type"
              required
              defaultValue={editingItem?.type || 'office'}
              options={[
                { value: 'office', label: 'Office' },
                { value: 'branch', label: 'Branch' },
                { value: 'project_site', label: 'Project Site / On-site' },
                { value: 'remote_zone', label: 'Remote Designated Zone' }
              ]}
            />
          </div>
          
          {/* Interactive Map Selector - Only render when modal is open */}
          {showModal && (
            <div className="border-t pt-4">
              <MapSelector
                latitude={mapLocation.latitude}
                longitude={mapLocation.longitude}
                radius={mapRadius}
                onLocationChange={handleLocationChange}
                onRadiusChange={handleRadiusChange}
                height="400px"
              />
            </div>
          )}

          <Input
            label="Address (Optional - Auto-filled from map)"
            name="address"
            defaultValue={mapLocation.address || editingItem?.location?.address || ''}
            placeholder="Full address"
            readOnly
            className="bg-gray-50"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Device Restriction"
              name="deviceRestriction"
              defaultValue={editingItem?.deviceRestriction || 'any_device'}
              options={[
                { value: 'mobile_only', label: 'Mobile Only' },
                { value: 'any_device', label: 'Any Device' }
              ]}
            />
            <Select
              label="Status"
              name="isActive"
              required
              defaultValue={editingItem?.isActive !== false ? 'true' : 'false'}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' }
              ]}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Enforcement Rules</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Enable Enforcement"
                name="enforcementEnabled"
                defaultValue={editingItem?.enforcement?.enabled !== false ? 'true' : 'false'}
                options={[
                  { value: 'true', label: 'Enabled' },
                  { value: 'false', label: 'Disabled' }
                ]}
              />
              <Select
                label="Apply To"
                name="applyTo"
                defaultValue={editingItem?.enforcement?.applyTo || 'all'}
                options={[
                  { value: 'all', label: 'All Employees' },
                  { value: 'departments', label: 'Specific Departments' },
                  { value: 'roles', label: 'Specific Roles' }
                ]}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Override Rules</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="allowOutsidePunch"
                  defaultChecked={editingItem?.overrideRules?.allowOutsidePunch || false}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm">Allow punch outside geo-fence</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="requireHRApproval"
                  defaultChecked={editingItem?.overrideRules?.requireHRApproval !== false}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm">Require HR approval for external punches</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingItem(null) }}>
              Cancel
            </Button>
            <Button type="submit" isLoading={fenceMutation.isLoading}>
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review Violation Modal */}
      <Modal
        isOpen={showViolationModal}
        onClose={() => { setShowViolationModal(false); setSelectedViolation(null) }}
        title="Review Geo-Fence Violation"
        size="md"
      >
        {selectedViolation && (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600">Employee</div>
              <div className="font-medium">
                {selectedViolation.employee?.firstName} {selectedViolation.employee?.lastName}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Distance from Fence</div>
              <div className="font-medium">{selectedViolation.distance}m</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Location</div>
              <div className="font-medium">
                {selectedViolation.location?.latitude?.toFixed(6)}, {selectedViolation.location?.longitude?.toFixed(6)}
              </div>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              reviewViolationMutation.mutate({
                id: selectedViolation._id,
                status: formData.get('status'),
                comments: formData.get('comments') || ''
              })
            }}>
              <Select
                label="Decision"
                name="status"
                required
                options={[
                  { value: 'approved', label: 'Approve' },
                  { value: 'rejected', label: 'Reject' }
                ]}
              />
              <Input
                label="Comments (Optional)"
                name="comments"
                type="textarea"
                rows="3"
              />
              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="secondary" onClick={() => { setShowViolationModal(false); setSelectedViolation(null) }}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={reviewViolationMutation.isLoading}>
                  Submit Review
                </Button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={() => {
          deleteFenceMutation.mutate(deleteItem._id)
        }}
        title="Delete Geo-Fence"
        message={`Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

export default GeoFences

