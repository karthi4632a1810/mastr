import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Table from '../../components/Table';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Lock,
  Play,
  FileText,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  Building,
  Clock,
  XCircle
} from 'lucide-react';

const PayrollDashboard = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showPayslipsModal, setShowPayslipsModal] = useState(false);
  const [showPayslipPreview, setShowPayslipPreview] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [newPayroll, setNewPayroll] = useState({ month: currentMonth, year: currentYear });

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['payroll-dashboard', selectedYear],
    queryFn: () => api.get(`/payroll/dashboard?year=${selectedYear}`).then(res => res.data.data)
  });

  // Fetch payroll runs
  const { data: payrollRuns, isLoading: runsLoading, refetch: refetchRuns } = useQuery({
    queryKey: ['payroll-runs', selectedYear],
    queryFn: () => api.get(`/payroll/runs?year=${selectedYear}`).then(res => res.data.data)
  });

  // Create payroll run
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/payroll/runs', data),
    onSuccess: () => {
      showToast('Payroll run created successfully', 'success');
      queryClient.invalidateQueries(['payroll-runs']);
      queryClient.invalidateQueries(['payroll-dashboard']);
      setShowCreateModal(false);
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to create payroll run', 'error');
    }
  });

  // Run validation
  const validationMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/runs/${id}/validate`),
    onSuccess: (response) => {
      const data = response.data.data;
      showToast(`Validation complete: ${data.passed} passed, ${data.failed} failed`, 
        data.failed > 0 ? 'warning' : 'success');
      refetchRuns();
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Validation failed', 'error');
    }
  });

  // Process payroll
  const processMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/runs/${id}/process`),
    onSuccess: (response) => {
      const data = response.data.data;
      showToast(`Payroll processed: ${data.summary.processedCount} employees`, 'success');
      queryClient.invalidateQueries(['payroll-runs']);
      queryClient.invalidateQueries(['payroll-dashboard']);
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Processing failed', 'error');
    }
  });

  // Lock payroll
  const lockMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/payroll/runs/${id}/lock`, { reason }),
    onSuccess: () => {
      showToast('Payroll locked successfully', 'success');
      queryClient.invalidateQueries(['payroll-runs']);
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to lock payroll', 'error');
    }
  });

  // Fetch payslips for a run
  const { data: payslips, isLoading: payslipsLoading } = useQuery({
    queryKey: ['payslips', selectedRun?._id],
    queryFn: () => api.get(`/payroll/payslips?payrollRunId=${selectedRun._id}`).then(res => res.data.data),
    enabled: !!selectedRun && showPayslipsModal
  });

  // Generate report
  const reportMutation = useMutation({
    mutationFn: ({ id, reportType }) => api.post(`/payroll/runs/${id}/reports`, { reportType }),
    onSuccess: (response) => {
      showToast('Report generated successfully', 'success');
      // Handle report display/download here
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to generate report', 'error');
    }
  });

  // Fetch payslip HTML
  const { data: payslipHtml } = useQuery({
    queryKey: ['payslip-html', selectedPayslip?._id],
    queryFn: () => api.get(`/payroll/payslips/${selectedPayslip._id}/html`).then(res => res.data.data.html),
    enabled: !!selectedPayslip && showPayslipPreview
  });

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      validating: 'bg-blue-100 text-blue-700',
      validated: 'bg-cyan-100 text-cyan-700',
      processing: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      locked: 'bg-purple-100 text-purple-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status?.toUpperCase()}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (dashboardLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage monthly payroll processing</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button onClick={() => setShowCreateModal(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            New Payroll Run
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">YTD Gross Salary</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(dashboardData?.ytdTotals?.totalGross)}
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">YTD Net Paid</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(dashboardData?.ytdTotals?.totalNet)}
              </p>
            </div>
            <DollarSign className="w-10 h-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">YTD Deductions</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(dashboardData?.ytdTotals?.totalDeductions)}
              </p>
            </div>
            <Building className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Pending Setup</p>
              <p className="text-2xl font-bold mt-1">
                {dashboardData?.employeesWithoutSalary || 0}
              </p>
              <p className="text-orange-200 text-xs">employees</p>
            </div>
            <Users className="w-10 h-10 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Pending Payroll Alert */}
      {dashboardData?.pendingPayroll && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-4">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
          <div className="flex-1">
            <p className="font-medium text-yellow-800">
              Payroll for {monthNames[dashboardData.pendingPayroll.month]} {dashboardData.pendingPayroll.year} is pending
            </p>
            <p className="text-sm text-yellow-600">
              Status: {dashboardData.pendingPayroll.status}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setSelectedRun(dashboardData.pendingPayroll);
              if (dashboardData.pendingPayroll.status === 'draft') {
                validationMutation.mutate(dashboardData.pendingPayroll._id);
              } else if (dashboardData.pendingPayroll.status === 'validated') {
                processMutation.mutate(dashboardData.pendingPayroll._id);
              }
            }}
          >
            {dashboardData.pendingPayroll.status === 'draft' ? 'Run Validation' : 'Process Now'}
          </Button>
        </div>
      )}

      {/* Payroll Runs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Payroll Runs - {selectedYear}</h2>
        </div>
        
        {runsLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : payrollRuns?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p>No payroll runs for {selectedYear}</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4">
              Create First Payroll Run
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payrollRuns?.map((run) => (
                  <tr key={run._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">{monthNames[run.month]} {run.year}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(run.status)}
                        {run.isLocked && <Lock className="w-4 h-4 text-purple-600" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {run.eligibleEmployees || run.totalEmployees || '-'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {formatCurrency(run.totalAmount)}
                    </td>
                    <td className="px-6 py-4">
                      {run.validationRun?.ranAt ? (
                        <div className="flex items-center gap-2">
                          {run.validationRun.failed === 0 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                          <span className="text-sm text-gray-600">
                            {run.validationRun.passed}/{run.validationRun.totalChecked}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {run.processedAt ? new Date(run.processedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {run.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => validationMutation.mutate(run._id)}
                            disabled={validationMutation.isPending}
                          >
                            <RefreshCw className={`w-4 h-4 ${validationMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        
                        {(run.status === 'validated' || (run.status === 'draft' && run.validationRun?.failed === 0)) && (
                          <Button
                            size="sm"
                            onClick={() => processMutation.mutate(run._id)}
                            disabled={processMutation.isPending}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Process
                          </Button>
                        )}
                        
                        {run.status === 'completed' && !run.isLocked && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => lockMutation.mutate({ id: run._id, reason: 'Monthly finalization' })}
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            Lock
                          </Button>
                        )}
                        
                        {(run.status === 'completed' || run.status === 'locked') && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRun(run);
                                setShowPayslipsModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRun(run);
                                setShowReportsModal(true);
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {run.validationRun?.failed > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-yellow-600 border-yellow-600"
                            onClick={() => {
                              setSelectedRun(run);
                              setShowValidationModal(true);
                            }}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Summary Chart */}
      {dashboardData?.monthlySummary?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Payroll Summary</h2>
          <div className="grid grid-cols-12 gap-2 h-48">
            {Array.from({ length: 12 }, (_, i) => {
              const monthData = dashboardData.monthlySummary.find(m => m._id === i + 1);
              const maxAmount = Math.max(...dashboardData.monthlySummary.map(m => m.totalNet));
              const height = monthData ? (monthData.totalNet / maxAmount) * 100 : 0;
              
              return (
                <div key={i} className="flex flex-col items-center justify-end h-full">
                  <div 
                    className={`w-full rounded-t-lg transition-all ${
                      monthData ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-gray-100'
                    }`}
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={monthData ? formatCurrency(monthData.totalNet) : 'No data'}
                  />
                  <span className="text-xs text-gray-500 mt-2">{monthNames[i + 1].slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Payroll Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Payroll Run"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={newPayroll.month}
                onChange={(e) => setNewPayroll({ ...newPayroll, month: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.slice(1).map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={newPayroll.year}
                onChange={(e) => setNewPayroll({ ...newPayroll, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will create a new payroll run for {monthNames[newPayroll.month]} {newPayroll.year}.
              You can then run validation checks and process the payroll.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button 
              onClick={() => createMutation.mutate(newPayroll)}
              disabled={createMutation.isPending}
            >
              Create Payroll Run
            </Button>
          </div>
        </div>
      </Modal>

      {/* Validation Errors Modal */}
      <Modal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        title={`Validation Errors - ${selectedRun ? monthNames[selectedRun.month] + ' ' + selectedRun.year : ''}`}
        size="lg"
      >
        {selectedRun?.validationErrors?.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                <XCircle className="w-4 h-4" />
                {selectedRun.validationErrors.filter(e => e.severity === 'error' && !e.isResolved).length} Errors
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                <AlertTriangle className="w-4 h-4" />
                {selectedRun.validationErrors.filter(e => e.severity === 'warning' && !e.isResolved).length} Warnings
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3">
              {selectedRun.validationErrors.map((error, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-lg border ${
                    error.isResolved 
                      ? 'bg-gray-50 border-gray-200' 
                      : error.severity === 'error' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{error.employeeName}</span>
                        <span className="text-sm text-gray-500">({error.employeeId})</span>
                        {error.isResolved && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">Resolved</span>
                        )}
                      </div>
                      <p className={`text-sm mt-1 ${
                        error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {error.message}
                      </p>
                      <span className="text-xs text-gray-400 mt-1 block">
                        Type: {error.errorType?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowValidationModal(false)}>Close</Button>
              <Button onClick={() => validationMutation.mutate(selectedRun._id)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Re-run Validation
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <p>No validation errors found</p>
          </div>
        )}
      </Modal>

      {/* Reports Modal */}
      <Modal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        title={`Generate Reports - ${selectedRun ? monthNames[selectedRun.month] + ' ' + selectedRun.year : ''}`}
      >
        <div className="space-y-4">
          <p className="text-gray-600">Select a report to generate:</p>
          
          <div className="grid grid-cols-2 gap-4">
            {[
              { type: 'bank_transfer', name: 'Bank Transfer Sheet', icon: Building },
              { type: 'salary_register', name: 'Salary Register', icon: FileText },
              { type: 'pf_report', name: 'PF Report', icon: Users },
              { type: 'esi_report', name: 'ESI Report', icon: Users },
              { type: 'pt_report', name: 'Professional Tax', icon: DollarSign },
              { type: 'journal_voucher', name: 'Journal Voucher', icon: FileText },
            ].map((report) => (
              <button
                key={report.type}
                onClick={() => reportMutation.mutate({ id: selectedRun._id, reportType: report.type })}
                disabled={reportMutation.isPending}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                <report.icon className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">{report.name}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowReportsModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Payslips Modal */}
      <Modal
        isOpen={showPayslipsModal}
        onClose={() => {
          setShowPayslipsModal(false);
          setSelectedRun(null);
        }}
        title={`Payslips - ${selectedRun ? monthNames[selectedRun.month] + ' ' + selectedRun.year : ''}`}
        size="xl"
      >
        {payslipsLoading ? (
          <div className="py-8 text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-600">{payslips?.length || 0} payslips generated</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payslips?.map((payslip) => (
                    <tr key={payslip._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{payslip.employeeSnapshot?.name}</p>
                          <p className="text-sm text-gray-500">{payslip.employeeSnapshot?.employeeId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(payslip.grossSalary)}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        -{formatCurrency(payslip.totalDeductions)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(payslip.netSalary)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPayslip(payslip);
                            setShowPayslipPreview(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPayslipsModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payslip Preview Modal */}
      <Modal
        isOpen={showPayslipPreview}
        onClose={() => {
          setShowPayslipPreview(false);
          setSelectedPayslip(null);
        }}
        title="Payslip Preview"
        size="lg"
      >
        {payslipHtml ? (
          <div className="space-y-4">
            <div 
              className="border rounded-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: payslipHtml }}
            />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPayslipPreview(false)}>Close</Button>
              <Button 
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(payslipHtml);
                  printWindow.document.close();
                  printWindow.print();
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Print / Download
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <LoadingSpinner />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayrollDashboard;

