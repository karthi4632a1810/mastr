import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import DatePicker from '../../components/DatePicker'
import Modal from '../../components/Modal'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { useToast } from '../../contexts/ToastContext'
import { Plus, Trash2, AlertCircle, UploadCloud, FileText, CheckCircle2 } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { label: 'Travel', value: 'travel' },
  { label: 'Food', value: 'food' },
  { label: 'Accommodation', value: 'accommodation' },
  { label: 'Fuel', value: 'fuel' },
  { label: 'Internet', value: 'internet' },
  { label: 'Misc', value: 'misc' },
]

const TRIP_TYPES = [
  { label: 'Local', value: 'local' },
  { label: 'Domestic Travel', value: 'domestic' },
  { label: 'International Travel', value: 'international' },
]

const defaultItem = () => ({
  expenseDate: '',
  category: '',
  subCategory: '',
  amount: '',
  currency: 'INR',
  notes: '',
})

const defaultClaim = {
  title: '',
  tripType: 'local',
  purpose: '',
  startDate: '',
  endDate: '',
  costCenter: '',
  project: '',
  currency: 'INR',
}

const Expenses = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [claim, setClaim] = useState(defaultClaim)
  const [items, setItems] = useState([defaultItem()])
  const [attachments, setAttachments] = useState([])
  const fileInputRef = useRef(null)
  const [selectedClaim, setSelectedClaim] = useState(null)

  const { data: claimsData, isLoading, error } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await api.get('/expenses')
      return res.data.data || res.data
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load expenses', 'error')
    }
  })

  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.amount || 0), 0),
    [items]
  )

  const mutation = useMutation({
    mutationFn: async (status) => {
      const fd = new FormData()
      Object.entries(claim).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, v)
      })
      fd.append('items', JSON.stringify(items))
      fd.append('status', status === 'draft' ? 'draft' : 'pending')
      fd.append('saveAsDraft', status === 'draft')
      if (fileInputRef.current?.files?.length) {
        Array.from(fileInputRef.current.files).forEach((f) => fd.append('attachments', f))
      }
      const res = await api.post('/expenses', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      return res.data
    },
    onSuccess: (_, variables) => {
      showToast(variables === 'draft' ? 'Saved as draft' : 'Expense submitted', 'success')
      setClaim(defaultClaim)
      setItems([defaultItem()])
      setAttachments([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      queryClient.invalidateQueries(['expenses'])
    },
    onError: (err) => {
      showToast(err.response?.data?.message || 'Failed to save expense', 'error')
    }
  })

  const updateItem = (idx, patch) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const addItem = () => setItems((prev) => [...prev, defaultItem()])
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const validate = () => {
    if (!claim.title || !claim.purpose || !claim.startDate || !claim.endDate) return 'Fill required fields'
    if (!items.length) return 'Add at least one item'
    if (items.some(i => !i.expenseDate || !i.category || !i.amount)) return 'Each item needs date, category, amount'
    return null
  }

  const handleSubmit = (status) => {
    const err = validate()
    if (err) {
      showToast(err, 'error')
      return
    }
    mutation.mutate(status)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Claims</h1>
          <p className="text-gray-600">Submit claims with multiple line items and attachments</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Running total</div>
          <div className="text-2xl font-semibold text-gray-900">₹{totalAmount.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Claim Title *" value={claim.title} onChange={(e) => setClaim({ ...claim, title: e.target.value })} />
          <Select
            label="Trip Type"
            value={claim.tripType}
            onChange={(e) => setClaim({ ...claim, tripType: e.target.value })}
            options={TRIP_TYPES}
          />
          <Input label="Purpose *" value={claim.purpose} onChange={(e) => setClaim({ ...claim, purpose: e.target.value })} />
          <Input label="Cost Center / Project" value={claim.costCenter} onChange={(e) => setClaim({ ...claim, costCenter: e.target.value })} />
          <DatePicker label="Start Date *" value={claim.startDate} onChange={(val) => setClaim({ ...claim, startDate: val })} />
          <DatePicker label="End Date *" value={claim.endDate} onChange={(val) => setClaim({ ...claim, endDate: val })} />
        </div>

        <div className="flex items-center justify-between mt-4">
          <h3 className="text-lg font-semibold text-gray-900">Expense Items</h3>
          <Button variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-800">Item {idx + 1}</div>
                {items.length > 1 && (
                  <button className="text-red-500 text-sm flex items-center" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <DatePicker label="Expense Date *" value={item.expenseDate} onChange={(val) => updateItem(idx, { expenseDate: val })} />
                <Select
                  label="Category *"
                  value={item.category}
                  onChange={(e) => updateItem(idx, { category: e.target.value })}
                  options={CATEGORY_OPTIONS}
                />
                <Input label="Sub-category" value={item.subCategory} onChange={(e) => updateItem(idx, { subCategory: e.target.value })} />
                <Input label="Amount *" type="number" value={item.amount} onChange={(e) => updateItem(idx, { amount: e.target.value })} />
                <Input label="Currency" value={item.currency} onChange={(e) => updateItem(idx, { currency: e.target.value })} />
                <Input label="Notes" value={item.notes} onChange={(e) => updateItem(idx, { notes: e.target.value })} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (PDF/JPG/PNG, multiple allowed)</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            className="w-full text-sm text-gray-700"
            onChange={(e) => setAttachments(Array.from(e.target.files || []))}
          />
          {attachments.length > 0 && (
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> {attachments.length} file(s) selected
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={mutation.isPending}>
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit('pending')} disabled={mutation.isPending}>
            {mutation.isPending ? 'Submitting...' : 'Submit Claim'}
          </Button>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" /> Required: title, purpose, start/end dates, and at least one item with date, category, amount.
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">My Claims</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Trip</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <LoadingSpinner size="lg" text="Loading expense claims..." />
                  </td>
                </tr>
              )}
              {error && !isLoading && (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <EmptyState
                      icon={AlertCircle}
                      title="Error loading claims"
                      message={error.response?.data?.message || 'Failed to load expense claims. Please try again.'}
                    />
                  </td>
                </tr>
              )}
              {!isLoading && !error && claimsData && claimsData.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <EmptyState
                      icon={FileText}
                      title="No expense claims"
                      message="You haven't created any expense claims yet."
                      actionLabel="Create Claim"
                      onAction={() => {
                        // Scroll to form or show form
                        document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    />
                  </td>
                </tr>
              )}
              {!isLoading && (claimsData || []).map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className="font-semibold text-gray-900">{c.title}</div>
                    <div className="text-xs text-gray-500">{c.purpose}</div>
                  </td>
                  <td className="capitalize">{c.tripType}</td>
                  <td className="text-sm text-gray-700">
                    {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'} - {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      c.status === 'approved' ? 'bg-green-50 text-green-700' :
                      c.status === 'rejected' ? 'bg-red-50 text-red-700' :
                      c.status === 'draft' ? 'bg-gray-50 text-gray-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="font-medium text-gray-900">₹{(c.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setSelectedClaim(c)}>View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClaim && (
        <Modal isOpen={true} onClose={() => setSelectedClaim(null)} title="" size="large">
          <div className="space-y-0">
            {/* Professional Header Banner */}
            <div className="bg-gradient-to-r from-primary-700 to-primary-800 text-white px-6 py-6 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-1">Expense Claim Details</h1>
                  <p className="text-primary-100 text-sm">{selectedClaim.title}</p>
                  <p className="text-primary-200 text-xs font-mono mt-1">Claim ID: {selectedClaim._id?.slice(-8)}</p>
                </div>
                <div className="text-right">
                  <div className="text-primary-100 text-sm mb-1">Total Amount</div>
                  <div className="text-2xl font-bold">₹{(selectedClaim.totalAmount || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>

            {/* EXPENSE INFORMATION Section */}
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
                Expense Information
              </h2>
              <div className="bg-white space-y-0">
                <DetailRow label="Purpose" value={selectedClaim.purpose || 'N/A'} />
                <DetailRow label="Trip Type" value={selectedClaim.tripType ? selectedClaim.tripType.charAt(0).toUpperCase() + selectedClaim.tripType.slice(1) : 'N/A'} />
                <DetailRow 
                  label="Status" 
                  value={
                    <span className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
                      selectedClaim.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedClaim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      selectedClaim.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedClaim.status?.charAt(0).toUpperCase() + selectedClaim.status?.slice(1)}
                    </span>
                  } 
                />
                <DetailRow 
                  label="Dates" 
                  value={
                    selectedClaim.startDate && selectedClaim.endDate
                      ? `${new Date(selectedClaim.startDate).toLocaleDateString()} - ${new Date(selectedClaim.endDate).toLocaleDateString()}`
                      : 'N/A'
                  } 
                />
                <DetailRow label="Cost Center" value={selectedClaim.costCenter || 'N/A'} />
              </div>
            </div>

            {/* EXPENSE ITEMS Section */}
            {selectedClaim.items && selectedClaim.items.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
                  Expense Items
                </h2>
                <div className="bg-white space-y-2">
                  {selectedClaim.items.map((it, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-semibold text-gray-900">{it.category} {it.subCategory ? `• ${it.subCategory}` : ''}</div>
                        <div className="font-bold text-gray-900 text-lg">₹{(it.amount || 0).toLocaleString('en-IN')}</div>
                      </div>
                      {it.expenseDate && (
                        <div className="text-sm text-gray-600 mb-1">Date: {new Date(it.expenseDate).toLocaleDateString()}</div>
                      )}
                      {it.notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">{it.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ATTACHMENTS Section */}
            {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase mb-4 pb-2 border-b-2 border-primary-600">
                  Attachments
                </h2>
                <div className="bg-white space-y-2">
                  {selectedClaim.attachments.map((att, idx) => (
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

export default Expenses

