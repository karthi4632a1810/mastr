import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { useState } from 'react'
import { Search, Filter, Download, FileText, User, Calendar, Activity } from 'lucide-react'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Select from '../../components/Select'
import { format } from 'date-fns'

const AuditLogs = () => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search, actionFilter, startDate, endDate],
    queryFn: async () => {
      const params = { page, limit: 20 }
      if (search) params.search = search
      if (actionFilter) params.action = actionFilter
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await api.get('/audit', { params })
      return response.data
    },
  })

  const logs = data?.data || []
  const pagination = data?.pagination || {}

  const getActionColor = (action) => {
    if (action?.includes('CREATE')) return 'text-green-600'
    if (action?.includes('UPDATE')) return 'text-blue-600'
    if (action?.includes('DELETE')) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600 mt-1">Track all system activities and changes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action, or resource"
          />
          <Input
            label="Action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="e.g., CREATE, UPDATE, DELETE"
          />
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>IP Address</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="text-sm">
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td>
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm">{log.userEmail || 'N/A'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600">{log.resource || 'N/A'}</td>
                      <td className="text-sm text-gray-500">{log.ipAddress || 'N/A'}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.statusCode >= 200 && log.statusCode < 300
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.statusCode || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
            <p className="mt-1 text-sm text-gray-500">No logs match your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditLogs

