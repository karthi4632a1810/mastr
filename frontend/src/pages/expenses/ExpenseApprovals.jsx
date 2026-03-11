import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../contexts/ToastContext'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  UploadCloud,
  Clock
} from 'lucide-react'

const statusBadge = (status) => {
  switch (status) {
    case 'approved': return 'bg-green-50 text-green-700'
    case 'rejected': return 'bg-red-50 text-red-700'
    case 'draft': return 'bg-gray-50 text-gray-700'
    default: return 'bg-amber-50 text-amber-700'
  }
}

const ExpenseApprovals = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [approverNote, setApproverNote] = useState('')
  const [itemsOverride, setItemsOverride] = useState([])
  const [payment, setPayment] = useState({ paymentMethod: 'bank_transfer', paymentTxnId: '', paymentDate: '' })
  const [payClaim, setPayClaim] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['expense-approvals'],
    queryFn: async () => {
      const res = await api.get('/expenses', { params: { status: 'pending', limit: 100 } })
      return res.data.data || res.data
    },
    refetchInterval: 30000,
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load expense approvals', 'error')
    },
  })

  const detailQuery = useQuery({
    queryKey: ['expense-detail', selected?._id],
    queryFn: async () => {
      const res = await api.get(`/expenses/${selected._id}`)
      return res.data.data
    },
    enabled: !!selected
  })

  const mutateStatus = useMutation({
    mutationFn: async ({ id, status, rejectionReason }) => {
      const payload = { status, approverNote, itemsOverride }
      if (rejectionReason) payload.rejectionReason = rejectionReason
      const res = await api.put(`/expenses/${id}/status`, payload)
      return res.data
    },
    onSuccess: () => {
      showToast('Updated claim', 'success')
      setSelected(null)
      setApproverNote('')
      setItemsOverride([])
      queryClient.invalidateQueries(['expense-approvals'])
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to update', 'error')
  })

  const mutatePay = useMutation({
    mutationFn: async ({ id }) => {
      const res = await api.put(`/expenses/${id}/status`, {
        status: 'paid',
        paymentMethod: payment.paymentMethod,
        paymentTxnId: payment.paymentTxnId,
        paymentDate: payment.paymentDate
      })
      return res.data
    },
    onSuccess: () => {
      showToast('Marked as paid', 'success')
      setPayClaim(null)
      setPayment({ paymentMethod: 'bank_transfer', paymentTxnId: '', paymentDate: '' })
      queryClient.invalidateQueries(['expense-approvals'])
    },
    onError: (err) => showToast(err.response?.data?.message || 'Failed to mark paid', 'error')
  })

  const claims = data || []

  const pendingAge = (createdAt) => {
    const created = new Date(createdAt)
    const now = new Date()
    const diffMs = now - created
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return days === 0 ? 'Today' : `${days}d`
  }

  const setItemAmount = (idx, amount) => {
    setItemsOverride((prev) => {
      const other = prev.filter(p => p.index !== idx)
      return [...other, { index: idx, amount }]
    })
  }

  const removeItem = (idx) => {
    setItemsOverride((prev) => {
      const other = prev.filter(p => p.index !== idx)
      return [...other, { index: idx, removed: true }]
    })
  }

  const currentDetail = detailQuery.data
  const adjustedTotal = useMemo(() => {
    if (!currentDetail) return 0
    const overridesMap = Object.fromEntries(itemsOverride.map(o => [Number(o.index), o]))
    return (currentDetail.items || []).reduce((sum, item, idx) => {
      const o = overridesMap[idx]
      if (o?.removed) return sum
      const amt = o?.amount !== undefined ? Number(o.amount || 0) : Number(item.amount || 0)
      return sum + amt
    }, 0)
  }, [currentDetail, itemsOverride])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Approvals</h1>
          <p className="text-gray-600">Review, approve, or reject claims</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Title</th>
              <th>Purpose</th>
              <th>Total</th>
              <th>Age</th>
              <th>Items</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan="8" className="text-center py-12">
                  <LoadingSpinner size="lg" text="Loading expense approvals..." />
                </td>
              </tr>
            )}
            {error && !isLoading && (
              <tr>
                <td colSpan="8" className="text-center py-12">
                  <EmptyState
                    icon={AlertCircle}
                    title="Error loading approvals"
                    message={error.response?.data?.message || 'Failed to load expense approvals. Please try again.'}
                  />
                </td>
              </tr>
            )}
            {!isLoading && !error && claims.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-12">
                  <EmptyState
                    icon={FileText}
                    title="No pending claims"
                    message="All expense claims have been processed."
                  />
                </td>
              </tr>
            )}
            {!isLoading && claims.map((c) => (
              <tr key={c._id}>
                <td>
                  <div className="font-semibold text-gray-900">{c.employee?.firstName} {c.employee?.lastName}</div>
                  <div className="text-xs text-gray-500 font-mono">{c.employee?.employeeId}</div>
                </td>
                <td className="text-sm text-gray-700">{c.employee?.department?.name || '—'}</td>
                <td>{c.title}</td>
                <td className="text-sm text-gray-700">{c.purpose}</td>
                <td className="font-semibold text-gray-900">₹{(c.totalAmount || 0).toLocaleString('en-IN')}</td>
                <td className="text-sm text-gray-700 flex items-center gap-1"><Clock className="h-4 w-4 text-gray-400" /> {pendingAge(c.createdAt)}</td>
                <td className="text-sm text-gray-700">{c.items?.length || 0}</td>
                <td className="text-right">
                  <Button size="sm" variant="outline" onClick={() => { setSelected(c); setApproverNote(''); setItemsOverride([]) }}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal isOpen={true} onClose={() => setSelected(null)} title="" size="large">
          {detailQuery.isLoading && (
            <div className="py-6">
              <LoadingSpinner size="md" text="Loading claim details..." />
            </div>
          )}
          {detailQuery.error && (
            <div className="py-6">
              <EmptyState
                icon={AlertCircle}
                title="Error loading claim"
                message={detailQuery.error.response?.data?.message || 'Failed to load claim details. Please try again.'}
              />
            </div>
          )}
          {currentDetail && (
            <div className="space-y-0">
              {/* Professional Header Banner */}
              <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">Expense Claim Details</h1>
                    <p className="text-primary-100 text-sm">{currentDetail.title}</p>
                    <p className="text-primary-200 text-xs font-mono mt-1">Claim ID: {currentDetail._id?.slice(-8) || selected._id?.slice(-8)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-primary-100 text-sm mb-1">Total Amount</div>
                    <div className="text-2xl font-bold">₹{(currentDetail.totalAmount || 0).toLocaleString('en-IN')}</div>
                    {itemsOverride.length > 0 && (
                      <div className="text-primary-200 text-xs mt-1">Adjusted: ₹{adjustedTotal.toLocaleString('en-IN')}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* EXPENSE INFORMATION Section */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
                  Expense Information
                </h2>
                <div className="bg-white space-y-0">
                  <DetailRow label="Employee" value={`${currentDetail.employee?.firstName || ''} ${currentDetail.employee?.lastName || ''}`.trim() || 'N/A'} />
                  <DetailRow label="Employee ID" value={currentDetail.employee?.employeeId || 'N/A'} />
                  <DetailRow label="Department" value={currentDetail.employee?.department?.name || 'N/A'} />
                  <DetailRow label="Purpose" value={currentDetail.purpose || 'N/A'} />
                  <DetailRow label="Trip Type" value={currentDetail.tripType ? currentDetail.tripType.charAt(0).toUpperCase() + currentDetail.tripType.slice(1) : 'N/A'} />
                  <DetailRow 
                    label="Status" 
                    value={
                      <span className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${statusBadge(currentDetail.status)}`}>
                        {currentDetail.status?.charAt(0).toUpperCase() + currentDetail.status?.slice(1)}
                      </span>
                    } 
                  />
                  <DetailRow 
                    label="Dates" 
                    value={
                      currentDetail.startDate && currentDetail.endDate
                        ? `${new Date(currentDetail.startDate).toLocaleDateString()} - ${new Date(currentDetail.endDate).toLocaleDateString()}`
                        : 'N/A'
                    } 
                  />
                </div>
              </div>

              {/* LINE ITEMS Section */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
                  Line Items {itemsOverride.length > 0 && '(Edit to partially approve)'}
                </h2>
                <div className="space-y-2">
                  {(currentDetail.items || []).map((it, idx) => {
                    const override = itemsOverride.find(o => Number(o.index) === idx)
                    const removed = override?.removed
                    const amount = override?.amount !== undefined ? override.amount : it.amount
                    return (
                      <div key={idx} className={`border rounded-lg p-3 text-sm ${removed ? 'bg-red-50 border-red-200' : 'border-gray-200'}`}>
                        <div className="flex justify-between">
                          <div className="font-semibold text-gray-800">
                            {it.category} {it.subCategory ? `• ${it.subCategory}` : ''} ({it.currency || 'INR'})
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="w-24 border border-gray-300 rounded px-2 py-1 text-right"
                              value={amount}
                              onChange={(e) => setItemAmount(idx, e.target.value)}
                              disabled={removed}
                            />
                            <button className="text-red-500 text-xs" onClick={() => removeItem(idx)}>Remove</button>
                          </div>
                        </div>
                        <div className="text-gray-600">{it.expenseDate ? new Date(it.expenseDate).toLocaleDateString() : ''}</div>
                        {it.notes && <div className="text-gray-600">{it.notes}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ATTACHMENTS Section */}
              {(currentDetail.attachments && currentDetail.attachments.length > 0) && (
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
                    Attachments
                  </h2>
                  <div className="bg-white space-y-2">
                    {currentDetail.attachments.map((att, idx) => (
                      <a 
                        key={idx} 
                        href={att.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-primary-50 hover:border-primary-200 border border-gray-200 transition-all group"
                      >
                        <UploadCloud className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">{att.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approver Note {selected?.status === 'rejected' && '(required)'}</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  value={approverNote}
                  onChange={(e) => setApproverNote(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={() => mutateStatus.mutate({ id: selected._id, status: 'rejected', rejectionReason: approverNote || 'Rejected' })} disabled={mutateStatus.isPending}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => mutateStatus.mutate({ id: selected._id, status: 'approved' })} disabled={mutateStatus.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
                </Button>
              </div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> Partial approvals supported via line edits/removals; approvals are logged with timestamp.
              </div>
            </div>
          )}
        </Modal>
      )}

      {payClaim && (
        <Modal isOpen={true} onClose={() => setPayClaim(null)} title="Mark as Paid">
          <div className="space-y-3">
            <Input
              label="Payment Method"
              value={payment.paymentMethod}
              onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })}
            />
            <Input
              label="Transaction ID"
              value={payment.paymentTxnId}
              onChange={(e) => setPayment({ ...payment, paymentTxnId: e.target.value })}
            />
            <Input
              label="Payment Date"
              type="date"
              value={payment.paymentDate}
              onChange={(e) => setPayment({ ...payment, paymentDate: e.target.value })}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayClaim(null)}>Cancel</Button>
            <Button onClick={() => mutatePay.mutate({ id: payClaim._id })} disabled={mutatePay.isPending}>
              {mutatePay.isPending ? 'Saving...' : 'Mark Paid'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-3 px-1 border-b border-gray-200 hover:bg-gray-50 transition-colors">
    <span className="text-gray-600 font-medium text-sm">{label}:</span>
    <span className="text-gray-900 font-semibold text-right max-w-md">{value}</span>
  </div>
)

export default ExpenseApprovals

