import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../contexts/ToastContext'
import {
  Search,
  Plus,
  Download,
  UploadCloud,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  User
} from 'lucide-react'

const STATUS_OPTIONS = [
  { label: 'Available', value: 'available' },
  { label: 'In Use', value: 'in_use' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Retired', value: 'retired' },
]

const CONDITION_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Good', value: 'good' },
  { label: 'Fair', value: 'fair' },
  { label: 'Damaged', value: 'damaged' },
]

const DEFAULT_FORM = {
  name: '',
  category: '',
  brand: '',
  model: '',
  serialNumber: '',
  imei: '',
  sku: '',
  purchaseDate: '',
  purchaseCost: '',
  vendor: '',
  warrantyExpiry: '',
  warrantyProvider: '',
  location: '',
  subLocation: '',
  condition: 'new',
  status: 'available',
  description: '',
  customAttributes: '',
}

const Assets = () => {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [filters, setFilters] = useState({ search: '', status: '', category: '', location: '', warrantyStatus: '' })
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [showCreate, setShowCreate] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    expectedReturnDate: '',
    assignmentPurpose: '',
    costCenter: '',
    conditionNote: '',
    approvalRequired: false,
    acknowledgementMethod: 'checkbox'
  })
  const [form, setForm] = useState(DEFAULT_FORM)
  const fileInputRef = useRef(null)
  const importInputRef = useRef(null)
  const conditionPhotoRef = useRef(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', filters, page, limit],
    queryFn: async () => {
      const response = await api.get('/assets', {
        params: {
          ...filters,
          page,
          limit,
        }
      })
      return response.data
    },
    keepPreviousData: true,
  })

  const { data: employeesData } = useQuery({
    queryKey: ['asset-employee-options'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { limit: 1000 } })
      return res.data?.data || res.data
    },
    enabled: showAssign,
  })

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) throw new Error('No asset selected')
      const fd = new FormData()
      Object.entries(assignForm).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          fd.append(k, v)
        }
      })
      if (conditionPhotoRef.current?.files?.length) {
        fd.append('conditionPhoto', conditionPhotoRef.current.files[0])
      }
      const res = await api.post(`/assets/${selectedAsset._id}/assign`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data
    },
    onSuccess: () => {
      showToast('Asset assigned', 'success')
      setShowAssign(false)
      setAssignForm({
        employeeId: '',
        expectedReturnDate: '',
        assignmentPurpose: '',
        costCenter: '',
        conditionNote: '',
        approvalRequired: false,
        acknowledgementMethod: 'checkbox'
      })
      if (conditionPhotoRef.current) conditionPhotoRef.current.value = ''
      queryClient.invalidateQueries(['assets'])
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to assign asset', 'error')
    }
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          fd.append(key, value)
        }
      })
      // Parse custom attributes JSON if provided
      if (form.customAttributes) {
        try {
          const parsed = JSON.parse(form.customAttributes)
          fd.set('customAttributes', JSON.stringify(parsed))
        } catch {
          // leave as-is, backend will validate
        }
      }
      if (fileInputRef.current?.files?.length) {
        Array.from(fileInputRef.current.files).forEach((file) => fd.append('attachments', file))
      }
      const res = await api.post('/assets', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return res.data
    },
    onSuccess: () => {
      showToast('Asset created', 'success')
      setShowCreate(false)
      setForm(DEFAULT_FORM)
      if (fileInputRef.current) fileInputRef.current.value = ''
      queryClient.invalidateQueries(['assets'])
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to create asset', 'error')
    }
  })

  const importMutation = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/assets/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return res.data
    },
    onSuccess: (data) => {
      showToast(`Import done. Success: ${data.summary?.success || 0}, Failed: ${data.summary?.failed || 0}`, 'success')
      queryClient.invalidateQueries(['assets'])
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Import failed', 'error')
    }
  })

  const assets = data?.data || []
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
    e.target.value = ''
  }

  const filteredStatusOptions = useMemo(() => [{ label: 'All Status', value: '' }, ...STATUS_OPTIONS], [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600">Manage inventory, imports, and exports</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => importInputRef.current?.click()} disabled={importMutation.isPending}>
            <UploadCloud className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />

          <a
            href={`${import.meta.env.PROD ? 'https://vaalboss.onrender.com' : ''}/api/assets/export?format=csv`}
            className="btn btn-secondary inline-flex items-center"
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </a>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, asset ID, serial, brand, model..."
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1) }}
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Select
          value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1) }}
          options={filteredStatusOptions.map(o => ({ label: o.label, value: o.value }))}
        />
        <Input
          placeholder="Category"
          value={filters.category}
          onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(1) }}
        />
        <Input
          placeholder="Location"
          value={filters.location}
          onChange={(e) => { setFilters({ ...filters, location: e.target.value }); setPage(1) }}
        />
        <select
          value={filters.warrantyStatus}
          onChange={(e) => { setFilters({ ...filters, warrantyStatus: e.target.value }); setPage(1) }}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">Warranty</option>
          <option value="active">Active</option>
          <option value="expiring_30">Expiring in 30d</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Asset ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Location</th>
              <th>Warranty Expiry</th>
              <th>Assigned To</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="8" className="text-center py-12">
                  <LoadingSpinner size="lg" text="Loading assets..." />
                </td>
              </tr>
            )}
            {error && !isLoading && (
              <tr>
                <td colSpan="8" className="text-center py-12">
                  <EmptyState
                    icon={AlertCircle}
                    title="Error loading assets"
                    message={error.response?.data?.message || 'Failed to load assets. Please try again.'}
                  />
                </td>
              </tr>
            )}
            {!isLoading && !error && assets.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-12">
                  <EmptyState
                    icon={User}
                    title="No assets found"
                    message="No assets match your search criteria. Try adjusting your filters."
                    actionLabel="Add Asset"
                    onAction={() => setShowCreate(true)}
                  />
                </td>
              </tr>
            )}
            {!isLoading && assets.map(asset => (
              <tr key={asset._id}>
                <td className="font-mono text-sm text-gray-700">{asset.assetId}</td>
                <td>
                  <div className="font-semibold text-gray-900">{asset.name}</div>
                  <div className="text-xs text-gray-500">{asset.brand} {asset.model}</div>
                </td>
                <td>{asset.category}</td>
                <td>
                  <span className="px-2 py-1 rounded-full text-xs bg-indigo-50 text-indigo-700 capitalize">
                    {asset.status?.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {asset.location || '—'} {asset.subLocation ? ` / ${asset.subLocation}` : ''}
                  </div>
                </td>
                <td>
                  {asset.warrantyExpiry ? (
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {new Date(asset.warrantyExpiry).toLocaleDateString()}
                    </div>
                  ) : '—'}
                </td>
                <td className="text-sm text-gray-700">
                  {asset.assignedTo ? `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}` : 'Unassigned'}
                </td>
                <td className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={asset.status === 'in_use'}
                    onClick={() => {
                      setSelectedAsset(asset)
                      setShowAssign(true)
                    }}
                  >
                    Assign
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
          <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.pages}</span>
          <Button variant="outline" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next</Button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Asset" size="large">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Asset Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Category *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input label="Model *" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <Input label="Brand *" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <Input label="Serial Number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
            <Input label="IMEI" value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <Input label="Vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            <DatePicker label="Purchase Date" value={form.purchaseDate} onChange={(val) => setForm({ ...form, purchaseDate: val })} />
            <Input label="Purchase Price" type="number" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} />
            <DatePicker label="Warranty Expiry" value={form.warrantyExpiry} onChange={(val) => setForm({ ...form, warrantyExpiry: val })} />
            <Input label="Warranty Provider" value={form.warrantyProvider} onChange={(e) => setForm({ ...form, warrantyProvider: e.target.value })} />
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input label="Sub-location" value={form.subLocation} onChange={(e) => setForm({ ...form, subLocation: e.target.value })} />
            <Select
              label="Condition"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              options={CONDITION_OPTIONS}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={STATUS_OPTIONS}
            />
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Attributes (JSON array of key/value)</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                rows={2}
                placeholder='[{"key":"color","value":"black"}]'
                value={form.customAttributes}
                onChange={(e) => setForm({ ...form, customAttributes: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (invoice/warranty/photos)</label>
              <input ref={fileInputRef} type="file" multiple className="w-full text-sm text-gray-700" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save Asset'}
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Required fields: Asset Name, Category, Model, Brand
          </div>
        </Modal>
      )}

      {/* Assign Modal */}
      {showAssign && selectedAsset && (
        <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title={`Assign ${selectedAsset.name}`}>
          <div className="space-y-3">
            <Select
              label="Employee *"
              value={assignForm.employeeId}
              onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
              options={[
                { label: 'Select employee', value: '' },
                ...(employeesData || []).map(emp => ({
                  label: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`,
                  value: emp._id
                }))
              ]}
            />
            <DatePicker
              label="Expected Return Date"
              value={assignForm.expectedReturnDate}
              onChange={(val) => setAssignForm({ ...assignForm, expectedReturnDate: val })}
            />
            <Input
              label="Purpose / Project"
              value={assignForm.assignmentPurpose}
              onChange={(e) => setAssignForm({ ...assignForm, assignmentPurpose: e.target.value })}
            />
            <Input
              label="Cost Center"
              value={assignForm.costCenter}
              onChange={(e) => setAssignForm({ ...assignForm, costCenter: e.target.value })}
            />
            <Input
              label="Condition Note"
              value={assignForm.conditionNote}
              onChange={(e) => setAssignForm({ ...assignForm, conditionNote: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition Photo</label>
              <input ref={conditionPhotoRef} type="file" accept="image/*" className="w-full text-sm text-gray-700" />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={assignForm.approvalRequired}
                onChange={(e) => setAssignForm({ ...assignForm, approvalRequired: e.target.checked })}
              />
              <span className="text-sm text-gray-700">Approval required (high-value asset)</span>
            </div>
            <Select
              label="Acknowledgement Method"
              value={assignForm.acknowledgementMethod}
              onChange={(e) => setAssignForm({ ...assignForm, acknowledgementMethod: e.target.value })}
              options={[
                { label: 'Checkbox', value: 'checkbox' },
                { label: 'E-sign (placeholder)', value: 'esign' },
                { label: 'OTP (placeholder)', value: 'otp' }
              ]}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !assignForm.employeeId}>
              {assignMutation.isPending ? 'Assigning...' : 'Assign Asset'}
            </Button>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Status will move to In Use; history is logged.
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Assets

