import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import Button from '../../components/Button'
import Table from '../../components/Table'
import Modal from '../../components/Modal'
import Input from '../../components/Input'
import Select from '../../components/Select'
import LoadingSpinner from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { Plus, Edit, ToggleRight, Calendar } from 'lucide-react'
import { useToast } from '../../contexts/ToastContext'

const LeaveTypesAdmin = () => {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const { data: leaveTypes, isLoading, error } = useQuery({
    queryKey: ['admin-leave-types'],
    queryFn: async () => {
      const res = await api.get('/leaves/types', { params: { includeInactive: true, includeHistory: false } })
      return res.data?.data || []
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to load leave types', 'error')
    },
  })

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (editing?._id) {
        return api.put(`/leaves/types/${editing._id}`, payload)
      }
      return api.post('/leaves/types', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-leave-types'])
      setShowModal(false)
      setEditing(null)
      showToast('Leave type saved', 'success')
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to save leave type', 'error')
    },
  })

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'code', header: 'Code' },
    { key: 'category', header: 'Category' },
    {
      key: 'accrual',
      header: 'Accrual',
      render: (value, row) => {
        if (!row) return '-'
        const frequency = row.rules?.accrual?.frequency || 'none'
        const ratePerCycle = row.rules?.accrual?.ratePerCycle || 0
        return `${frequency} @ ${ratePerCycle}`
      }
    },
    {
      key: 'carry',
      header: 'Carry Forward',
      render: (value, row) => {
        if (!row) return '-'
        return row.rules?.carryForward?.enabled ? `Yes (max ${row.rules?.carryForward?.maxDays || 0})` : 'No'
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (!row) return '-'
        const isActive = row.isActive ?? value
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
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
          <button
            className="text-primary-600 hover:text-primary-800 active:text-primary-900 text-sm font-medium flex items-center gap-1 min-h-[44px] px-3 py-2"
            onClick={() => { setEditing(row); setShowModal(true) }}
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
        )
      }
    }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const payload = {
      name: form.get('name'),
      code: form.get('code'),
      category: form.get('category'),
      description: form.get('description') || '',
      isPaid: form.get('isPaid') === 'true',
      isActive: form.get('isActive') === 'true',
      maxDays: Number(form.get('maxDays') || 0),
      rules: {
        accrual: {
          frequency: form.get('frequency'),
          ratePerCycle: Number(form.get('ratePerCycle') || 0),
          prorated: form.get('prorated') === 'true',
          startFrom: form.get('startFrom'),
          fiscalYearStartMonth: Number(form.get('fiscalYearStartMonth') || 4)
        },
        carryForward: {
          enabled: form.get('cfEnabled') === 'true',
          maxDays: Number(form.get('cfMax') || 0),
          expiresAfterMonths: Number(form.get('cfExpire') || 0),
          autoConvertToLop: form.get('cfLop') === 'true',
          encashable: form.get('cfEncash') === 'true'
        },
        encashment: {
          enabled: form.get('encEnabled') === 'true',
          eligibilityMonths: Number(form.get('encElig') || 0),
          maxEncashable: Number(form.get('encMax') || 0),
          formula: form.get('encFormula') || ''
        },
        usage: {
          minDays: Number(form.get('minDays') || 0),
          maxDaysPerRequest: Number(form.get('maxDaysReq') || 0),
          blockDuringProbation: form.get('blockProbation') === 'true',
          blockDuringNoticePeriod: form.get('blockNotice') === 'true',
          allowHalfDay: form.get('allowHalfDay') === 'true',
          allowHourly: form.get('allowHourly') === 'true',
          maxHoursPerRequest: Number(form.get('maxHours') || 0),
          requiresDocument: form.get('requiresDoc') === 'true',
          mandatoryDocumentTypes: form.get('docTypes') ? form.get('docTypes').split(',').map(s => s.trim()) : [],
          defaultReason: form.get('defaultReason') || ''
        }
      }
    }
    mutation.mutate(payload)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Types</h1>
          <p className="text-gray-600 mt-1">Configure leave types and rules</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowModal(true) }}>
          <Plus className="h-4 w-4 mr-2" /> New Leave Type
        </Button>
      </div>

      <div className="card">
        {isLoading ? (
          <LoadingSpinner size="lg" text="Loading leave types..." />
        ) : error ? (
          <EmptyState
            icon={Calendar}
            title="Error loading leave types"
            message={error.response?.data?.message || 'Failed to load leave types. Please try again.'}
          />
        ) : (
          <Table
            columns={columns}
            data={leaveTypes || []}
            isLoading={false}
            emptyMessage="No leave types configured"
          />
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditing(null) }}
        title={editing ? 'Edit Leave Type' : 'New Leave Type'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Name" name="name" required defaultValue={editing?.name || ''} />
            <Input label="Code" name="code" required defaultValue={editing?.code || ''} />
            <Select
              label="Category"
              name="category"
              defaultValue={editing?.category || 'general'}
              options={[
                { value: 'general', label: 'General' },
                { value: 'CL', label: 'Casual Leave' },
                { value: 'SL', label: 'Sick Leave' },
                { value: 'EL', label: 'Earned Leave' },
                { value: 'MAT', label: 'Maternity' },
                { value: 'PAT', label: 'Paternity' },
                { value: 'COMP_OFF', label: 'Comp-Off' },
                { value: 'LOP', label: 'Loss of Pay' },
                { value: 'OPT', label: 'Optional Holiday' },
              ]}
            />
            <Select
              label="Paid?"
              name="isPaid"
              defaultValue={String(editing?.isPaid ?? true)}
              options={[{ value: 'true', label: 'Paid' }, { value: 'false', label: 'Unpaid' }]}
            />
            <Select
              label="Status"
              name="isActive"
              defaultValue={String(editing?.isActive ?? true)}
              options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]}
            />
            <Input label="Description" name="description" defaultValue={editing?.description || ''} />
          <Input label="Max Days (annual cap)" name="maxDays" type="number" defaultValue={editing?.maxDays || 0} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-lg p-3">
            <p className="col-span-1 md:col-span-3 text-sm font-semibold text-gray-800">Accrual</p>
            <Select
              label="Frequency"
              name="frequency"
              defaultValue={editing?.rules?.accrual?.frequency || 'none'}
              options={[
                { value: 'none', label: 'None' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
            />
            <Input
              label="Rate per cycle (days)"
              name="ratePerCycle"
              type="number"
              step="0.25"
              defaultValue={editing?.rules?.accrual?.ratePerCycle || 0}
            />
            <Select
              label="Prorated first cycle"
              name="prorated"
              defaultValue={String(editing?.rules?.accrual?.prorated ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Select
              label="Start From"
              name="startFrom"
              defaultValue={editing?.rules?.accrual?.startFrom || 'joining'}
              options={[
                { value: 'joining', label: 'Joining Date' },
                { value: 'fiscal_year', label: 'Fiscal Year Start' },
              ]}
            />
            <Input
              label="Fiscal Year Start Month (1-12)"
              name="fiscalYearStartMonth"
              type="number"
              min="1"
              max="12"
              defaultValue={editing?.rules?.accrual?.fiscalYearStartMonth || 4}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-3">
            <p className="col-span-1 md:col-span-2 text-sm font-semibold text-gray-800">Carry Forward</p>
            <Select
              label="Enable"
              name="cfEnabled"
              defaultValue={String(editing?.rules?.carryForward?.enabled ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Input label="Max Days" name="cfMax" type="number" defaultValue={editing?.rules?.carryForward?.maxDays || 0} />
            <Input label="Expire After (months)" name="cfExpire" type="number" defaultValue={editing?.rules?.carryForward?.expiresAfterMonths || 0} />
            <Select
              label="Auto convert excess to LOP"
              name="cfLop"
              defaultValue={String(editing?.rules?.carryForward?.autoConvertToLop ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Select
              label="Encashable"
              name="cfEncash"
              defaultValue={String(editing?.rules?.carryForward?.encashable ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-lg p-3">
            <p className="col-span-1 md:col-span-3 text-sm font-semibold text-gray-800">Encashment</p>
            <Select
              label="Enable"
              name="encEnabled"
              defaultValue={String(editing?.rules?.encashment?.enabled ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Input label="Eligibility (months)" name="encElig" type="number" defaultValue={editing?.rules?.encashment?.eligibilityMonths || 0} />
            <Input label="Max Encashable" name="encMax" type="number" defaultValue={editing?.rules?.encashment?.maxEncashable || 0} />
            <Input label="Formula (note)" name="encFormula" defaultValue={editing?.rules?.encashment?.formula || ''} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-lg p-3">
            <p className="col-span-1 md:col-span-3 text-sm font-semibold text-gray-800">Usage Rules</p>
            <Input label="Min Days per request" name="minDays" type="number" defaultValue={editing?.rules?.usage?.minDays || 0} />
            <Input label="Max Days per request" name="maxDaysReq" type="number" defaultValue={editing?.rules?.usage?.maxDaysPerRequest || 0} />
            <Select
              label="Block during probation"
              name="blockProbation"
              defaultValue={String(editing?.rules?.usage?.blockDuringProbation ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Select
              label="Block during notice period"
              name="blockNotice"
              defaultValue={String(editing?.rules?.usage?.blockDuringNoticePeriod ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Select
              label="Allow Half Day"
              name="allowHalfDay"
              defaultValue={String(editing?.rules?.usage?.allowHalfDay ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Select
              label="Allow Hourly"
              name="allowHourly"
              defaultValue={String(editing?.rules?.usage?.allowHourly ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Input label="Max Hours per request" name="maxHours" type="number" step="0.25" defaultValue={editing?.rules?.usage?.maxHoursPerRequest || 0} />
            <Select
              label="Requires Document"
              name="requiresDoc"
              defaultValue={String(editing?.rules?.usage?.requiresDocument ?? false)}
              options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]}
            />
            <Input
              label="Document Types (comma separated)"
              name="docTypes"
              defaultValue={(editing?.rules?.usage?.mandatoryDocumentTypes || []).join(', ')}
            />
            <Input
              label="Default Reason"
              name="defaultReason"
              defaultValue={editing?.rules?.usage?.defaultReason || ''}
            />
          </div>

          <div className="flex justify-end pt-3">
            <Button type="submit" isLoading={mutation.isLoading}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default LeaveTypesAdmin

