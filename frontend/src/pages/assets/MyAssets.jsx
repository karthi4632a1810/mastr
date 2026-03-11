import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../contexts/ToastContext'
import api from '../../services/api'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useState } from 'react'
import {
  MapPin,
  Calendar,
  AlertCircle,
  Download,
  Wrench,
  RotateCcw,
  CheckCircle2
} from 'lucide-react'

const statusClass = (status) => {
  switch (status) {
    case 'in_use': return 'bg-green-50 text-green-700'
    case 'maintenance': return 'bg-amber-50 text-amber-700'
    case 'reserved': return 'bg-purple-50 text-purple-700'
    default: return 'bg-gray-50 text-gray-700'
  }
}

const MyAssets = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-assets'],
    queryFn: async () => {
      const res = await api.get('/assets/my')
      return res.data.data || []
    }
  })

  const acknowledge = useMutation({
    mutationFn: async (id) => {
      await api.put(`/assets/${id}/acknowledge`, { method: 'checkbox' })
    },
    onSuccess: () => {
      showToast('Acknowledged', 'success')
      queryClient.invalidateQueries(['my-assets'])
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to acknowledge', 'error')
  })

  const returnReq = useMutation({
    mutationFn: async (id) => {
      await api.post(`/assets/${id}/return-request`, { note })
    },
    onSuccess: () => {
      showToast('Return request submitted', 'success')
      queryClient.invalidateQueries(['my-assets'])
      setSelected(null); setNote('')
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to request return', 'error')
  })

  const maintReq = useMutation({
    mutationFn: async (id) => {
      await api.post(`/assets/${id}/maintenance-request`, { note })
    },
    onSuccess: () => {
      showToast('Maintenance request submitted', 'success')
      queryClient.invalidateQueries(['my-assets'])
      setSelected(null); setNote('')
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to request maintenance', 'error')
  })

  const assets = data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Assets</h1>
        <p className="text-gray-600">Assets assigned to you and their return timelines</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Assignment</th>
              <th>Status</th>
              <th>Location</th>
              <th>Vendor / Warranty</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan="6" className="text-center py-6 text-gray-500">Loading...</td></tr>
            )}
            {error && !isLoading && (
              <tr><td colSpan="6" className="text-center py-6 text-red-500">Failed to load assets</td></tr>
            )}
            {!isLoading && assets.length === 0 && (
              <tr><td colSpan="6" className="text-center py-6 text-gray-500">No assets assigned</td></tr>
            )}
            {!isLoading && assets.map(asset => (
              <tr key={asset._id}>
                <td>
                  <div className="font-semibold text-gray-900">{asset.name}</div>
                  <div className="text-xs text-gray-500">
                    {asset.category} • {asset.brand} {asset.model} • SN: {asset.serialNumber || '—'}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">ID: {asset.assetId}</div>
                </td>
                <td className="text-sm text-gray-700">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    Assigned: {asset.assignedDate ? new Date(asset.assignedDate).toLocaleDateString() : '—'}
                  </div>
                  <div className="flex items-center gap-1 text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    Return: {asset.expectedReturnDate ? new Date(asset.expectedReturnDate).toLocaleDateString() : '—'}
                  </div>
                </td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs capitalize ${statusClass(asset.status)}`}>
                    {asset.status?.replace('_', ' ')}
                  </span>
                  <div className="text-xs text-gray-500">Condition: {asset.condition || '—'}</div>
                </td>
                <td className="text-sm text-gray-700">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {asset.location || '—'} {asset.subLocation ? ` / ${asset.subLocation}` : ''}
                  </div>
                </td>
                <td className="text-sm text-gray-700">
                  <div>Vendor: {asset.vendor || '—'}</div>
                  <div>Warranty: {asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '—'}</div>
                </td>
                <td className="text-sm text-gray-700">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {(asset.attachments || [])
                        .filter(att => att.type === 'invoice' || att.type === 'warranty')
                        .map((att, idx) => (
                          <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm inline-flex items-center">
                            <Download className="h-4 w-4 mr-1" /> {att.type}
                          </a>
                        ))}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {!asset.assignmentAcknowledgement?.acknowledged && (
                        <Button size="sm" onClick={() => acknowledge.mutate(asset._id)} disabled={acknowledge.isPending}>Acknowledge</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setSelected({ asset, type: 'return' }); setNote('') }}>
                        <RotateCcw className="h-4 w-4 mr-1" /> Return
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelected({ asset, type: 'maintenance' }); setNote('') }}>
                        <Wrench className="h-4 w-4 mr-1" /> Maintenance
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal
          isOpen={true}
          onClose={() => setSelected(null)}
          title={selected.type === 'return' ? 'Return Request' : 'Maintenance Request'}
        >
          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              {selected.asset.name} • {selected.asset.assetId}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            {selected.type === 'return' ? (
              <Button onClick={() => returnReq.mutate(selected.asset._id)} disabled={returnReq.isPending}>
                {returnReq.isPending ? 'Submitting...' : 'Submit Return Request'}
              </Button>
            ) : (
              <Button onClick={() => maintReq.mutate(selected.asset._id)} disabled={maintReq.isPending}>
                {maintReq.isPending ? 'Submitting...' : 'Submit Maintenance Request'}
              </Button>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Request will be logged for HR/IT to process.
          </div>
        </Modal>
      )}
    </div>
  )
}

export default MyAssets

