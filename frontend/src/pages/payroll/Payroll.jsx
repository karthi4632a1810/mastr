import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { 
  DollarSign, 
  Download, 
  Calendar, 
  Eye, 
  TrendingUp, 
  Building,
  Mail,
  FileText,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  Calculator,
  Shield,
  Clock,
  User,
  CreditCard,
  Briefcase,
  PieChart
} from 'lucide-react';

const Payroll = () => {
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState('payslips');
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [comparePayslips, setComparePayslips] = useState({ first: null, second: null });

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Fetch employee's payslips
  const { data: payslipsData, isLoading: payslipsLoading } = useQuery({
    queryKey: ['my-payslips', selectedYear],
    queryFn: () => api.get(`/payroll/my/payslips?year=${selectedYear}`).then(res => res.data.data)
  });

  // Fetch YTD summary
  const { data: ytdData, isLoading: ytdLoading } = useQuery({
    queryKey: ['my-ytd-summary', selectedYear],
    queryFn: () => api.get(`/payroll/my/ytd-summary?year=${selectedYear}`).then(res => res.data.data)
  });

  // Fetch payslip details
  const { data: payslipDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['my-payslip-details', selectedPayslip?._id],
    queryFn: () => api.get(`/payroll/my/payslips/${selectedPayslip._id}`).then(res => res.data.data),
    enabled: !!selectedPayslip && showPayslipModal
  });

  // Fetch secure payslip HTML
  const { data: payslipHtml, isLoading: htmlLoading } = useQuery({
    queryKey: ['my-payslip-html', selectedPayslip?._id],
    queryFn: () => api.get(`/payroll/my/payslips/${selectedPayslip._id}/secure-html`).then(res => res.data.data.html),
    enabled: !!selectedPayslip && showPayslipModal
  });

  // Fetch comparison data
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery({
    queryKey: ['payslip-compare', comparePayslips.first?._id, comparePayslips.second?._id],
    queryFn: () => api.get(`/payroll/my/compare?payslip1Id=${comparePayslips.first._id}&payslip2Id=${comparePayslips.second._id}`)
      .then(res => res.data.data),
    enabled: !!comparePayslips.first && !!comparePayslips.second && showCompareModal
  });

  // Fetch tax projection
  const { data: taxProjection, isLoading: taxLoading } = useQuery({
    queryKey: ['my-tax-projection', currentYear],
    queryFn: () => api.get(`/payroll/my/tax-projection?year=${currentYear}`).then(res => res.data.data),
    enabled: showTaxModal
  });

  // Email payslip mutation
  const emailMutation = useMutation({
    mutationFn: (id) => api.post(`/payroll/my/payslips/${id}/email`),
    onSuccess: (response) => {
      showToast(response.data.message, 'success');
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to send email', 'error');
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleViewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setShowPayslipModal(true);
  };

  const handlePrintPayslip = () => {
    if (payslipHtml) {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(payslipHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleCompareSelect = (payslip, position) => {
    setComparePayslips(prev => ({ ...prev, [position]: payslip }));
  };

  const getChangeIcon = (value) => {
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (value) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  if (payslipsLoading && ytdLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payslips</h1>
          <p className="text-gray-500 mt-1">View your salary details, payslips, and tax information</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[currentYear - 2, currentYear - 1, currentYear].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <Button variant="outline" onClick={() => setShowTaxModal(true)}>
            <Calculator className="w-4 h-4 mr-2" />
            Tax Projection
          </Button>
        </div>
      </div>

      {/* YTD Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">YTD Gross Earnings</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(ytdData?.totals?.grossEarnings)}</p>
              <p className="text-emerald-200 text-xs mt-1">{payslipsData?.length || 0} months</p>
            </div>
            <TrendingUp className="w-10 h-10 text-emerald-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">YTD Deductions</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(ytdData?.totals?.totalDeductions)}</p>
              <p className="text-red-200 text-xs mt-1">Including statutory</p>
            </div>
            <Building className="w-10 h-10 text-red-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">YTD Net Salary</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(ytdData?.totals?.netSalary)}</p>
              <p className="text-blue-200 text-xs mt-1">Take home pay</p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">YTD Tax (TDS)</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(ytdData?.totals?.tds)}</p>
              <p className="text-purple-200 text-xs mt-1">Tax deducted</p>
            </div>
            <Shield className="w-10 h-10 text-purple-200" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'payslips', name: 'Payslips', icon: FileText },
              { id: 'summary', name: 'YTD Summary', icon: BarChart3 },
              { id: 'compare', name: 'Compare', icon: PieChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Payslips Tab */}
          {activeTab === 'payslips' && (
            <div>
              {payslipsLoading ? (
                <LoadingSpinner />
              ) : payslipsData?.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p>No payslips found for {selectedYear}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {payslipsData?.map((payslip) => (
                    <div 
                      key={payslip._id} 
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold text-gray-900">
                            {monthNames[payslip.month]} {payslip.year}
                          </span>
                        </div>
                        {payslip.payrollRun?.isLocked && (
                          <Shield className="w-4 h-4 text-green-500" title="Finalized" />
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Gross Salary</span>
                          <span className="font-medium text-green-600">{formatCurrency(payslip.grossSalary)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Deductions</span>
                          <span className="font-medium text-red-600">-{formatCurrency(payslip.totalDeductions)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-gray-700 font-medium">Net Pay</span>
                          <span className="font-bold text-blue-600">{formatCurrency(payslip.netSalary)}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleViewPayslip(payslip)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => emailMutation.mutate(payslip._id)}
                          disabled={emailMutation.isPending}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* YTD Summary Tab */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {ytdLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  {/* Monthly Chart */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Breakdown</h3>
                    <div className="grid grid-cols-12 gap-2 h-48">
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthData = ytdData?.monthlyBreakdown?.find(m => m.month === i + 1);
                        const maxAmount = Math.max(...(ytdData?.monthlyBreakdown?.map(m => m.netSalary) || [1]));
                        const height = monthData ? (monthData.netSalary / maxAmount) * 100 : 0;
                        
                        return (
                          <div key={i} className="flex flex-col items-center justify-end h-full">
                            <div 
                              className={`w-full rounded-t-lg transition-all cursor-pointer group relative ${
                                monthData ? 'bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500' : 'bg-gray-100'
                              }`}
                              style={{ height: `${Math.max(height, 5)}%` }}
                            >
                              {monthData && (
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {formatCurrency(monthData.netSalary)}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 mt-2">{monthNames[i + 1].slice(0, 3)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed YTD Table */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Earnings
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Basic Salary</span>
                            <span className="font-medium">{formatCurrency(ytdData?.totals?.basicSalary)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Overtime Pay</span>
                            <span className="font-medium">{formatCurrency(ytdData?.totals?.overtimePay)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-green-200">
                            <span className="font-medium text-green-800">Total Gross</span>
                            <span className="font-bold text-green-800">{formatCurrency(ytdData?.totals?.grossEarnings)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Deductions
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">PF (Employee)</span>
                            <span className="font-medium">{formatCurrency(ytdData?.totals?.pfEmployee)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">ESI (Employee)</span>
                            <span className="font-medium">{formatCurrency(ytdData?.totals?.esiEmployee)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Professional Tax</span>
                            <span className="font-medium">{formatCurrency(ytdData?.totals?.professionalTax)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">TDS</span>
                            <span className="font-medium">{formatCurrency(ytdData?.totals?.tds)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">LOP Deduction</span>
                            <span className="font-medium">{formatCurrency(ytdData?.totals?.lopDeduction)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-red-200">
                            <span className="font-medium text-red-800">Total Deductions</span>
                            <span className="font-bold text-red-800">{formatCurrency(ytdData?.totals?.totalDeductions)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Employer Contributions */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Employer Contributions (Not deducted from salary)
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">PF (Employer)</span>
                        <span className="font-medium">{formatCurrency(ytdData?.totals?.pfEmployer)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ESI (Employer)</span>
                        <span className="font-medium">{formatCurrency(ytdData?.totals?.esiEmployer)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Compare Tab */}
          {activeTab === 'compare' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Payslip</label>
                  <select
                    value={comparePayslips.first?._id || ''}
                    onChange={(e) => handleCompareSelect(
                      payslipsData?.find(p => p._id === e.target.value), 
                      'first'
                    )}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select payslip</option>
                    {payslipsData?.map(p => (
                      <option key={p._id} value={p._id}>
                        {monthNames[p.month]} {p.year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Second Payslip</label>
                  <select
                    value={comparePayslips.second?._id || ''}
                    onChange={(e) => handleCompareSelect(
                      payslipsData?.find(p => p._id === e.target.value), 
                      'second'
                    )}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select payslip</option>
                    {payslipsData?.map(p => (
                      <option key={p._id} value={p._id}>
                        {monthNames[p.month]} {p.year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {comparePayslips.first && comparePayslips.second && (
                <Button onClick={() => setShowCompareModal(true)}>
                  <PieChart className="w-4 h-4 mr-2" />
                  Compare Payslips
                </Button>
              )}

              {!comparePayslips.first || !comparePayslips.second ? (
                <div className="text-center py-12 text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p>Select two payslips to compare</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Payslip Details Modal */}
      <Modal
        isOpen={showPayslipModal}
        onClose={() => {
          setShowPayslipModal(false);
          setSelectedPayslip(null);
        }}
        title={`Payslip - ${selectedPayslip ? monthNames[selectedPayslip.month] + ' ' + selectedPayslip.year : ''}`}
        size="xl"
      >
        {htmlLoading || detailsLoading ? (
          <div className="py-8 text-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Leave Summary */}
            {payslipDetails?.leaveSummary?.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Leave Summary for this Month
                </h4>
                <div className="flex flex-wrap gap-3">
                  {payslipDetails.leaveSummary.map((leave, idx) => (
                    <span 
                      key={idx}
                      className={`px-3 py-1 rounded-full text-sm ${
                        leave.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {leave.type}: {leave.days} day(s) {!leave.isPaid && '(LOP)'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Payslip HTML */}
            {payslipHtml && (
              <div 
                className="border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: payslipHtml }}
              />
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-500">
                <Shield className="w-4 h-4 inline mr-1" />
                This payslip is confidential and watermarked
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => emailMutation.mutate(selectedPayslip._id)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email to Self
                </Button>
                <Button onClick={handlePrintPayslip}>
                  <Download className="w-4 h-4 mr-2" />
                  Print / Download
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Compare Modal */}
      <Modal
        isOpen={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="Payslip Comparison"
        size="lg"
      >
        {comparisonLoading ? (
          <div className="py-8 text-center">
            <LoadingSpinner />
          </div>
        ) : comparisonData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Period</p>
                <p className="font-semibold">{comparisonData.payslip1.period}</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-gray-400" />
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Period</p>
                <p className="font-semibold">{comparisonData.payslip2.period}</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Gross Salary', key: 'grossSalary' },
                { label: 'Total Deductions', key: 'totalDeductions' },
                { label: 'Net Salary', key: 'netSalary' },
              ].map((item) => (
                <div key={item.key} className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(comparisonData.payslip1[item.key])}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                    <div className={`flex items-center justify-center gap-1 ${getChangeColor(comparisonData.differences[item.key])}`}>
                      {getChangeIcon(comparisonData.differences[item.key])}
                      <span className="font-medium">
                        {formatCurrency(Math.abs(comparisonData.differences[item.key]))}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium">{formatCurrency(comparisonData.payslip2[item.key])}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-800">
                Net salary changed by{' '}
                <span className={`font-bold ${getChangeColor(comparisonData.differences.netSalary)}`}>
                  {comparisonData.differences.netPercentChange}%
                </span>
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCompareModal(false)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Tax Projection Modal */}
      <Modal
        isOpen={showTaxModal}
        onClose={() => setShowTaxModal(false)}
        title="Tax Projection"
        size="lg"
      >
        {taxLoading ? (
          <div className="py-8 text-center">
            <LoadingSpinner />
          </div>
        ) : taxProjection ? (
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600">{taxProjection.financialYear}</p>
              <p className="text-xs text-blue-500 mt-1">Based on current salary structure</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3">Projected Income</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Actual Gross (to date)</span>
                    <span className="font-medium">{formatCurrency(taxProjection.income.actualGrossToDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Projected Remaining</span>
                    <span className="font-medium">{formatCurrency(taxProjection.income.projectedRemainingGross)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <span className="font-medium">Annual Gross</span>
                    <span className="font-bold">{formatCurrency(taxProjection.income.projectedAnnualGross)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3">Deductions (80C & Others)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Standard Deduction</span>
                    <span className="font-medium">{formatCurrency(taxProjection.deductions.standardDeduction)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Section 80C (PF etc.)</span>
                    <span className="font-medium">{formatCurrency(taxProjection.deductions.section80C)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="font-medium">Total Deductions</span>
                    <span className="font-bold">{formatCurrency(taxProjection.deductions.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-800 mb-3">Tax Calculation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxable Income</span>
                  <span className="font-medium">{formatCurrency(taxProjection.tax.taxableIncome)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Projected Annual Tax</span>
                  <span className="font-medium">{formatCurrency(taxProjection.tax.projectedAnnualTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TDS Deducted (to date)</span>
                  <span className="font-medium text-green-600">-{formatCurrency(taxProjection.tax.actualTdsDeducted)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-purple-200">
                  <span className="font-medium">Remaining Tax Liability</span>
                  <span className="font-bold text-purple-800">{formatCurrency(taxProjection.tax.remainingTaxLiability)}</span>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span>Monthly TDS Required</span>
                  <span className="font-medium">{formatCurrency(taxProjection.tax.monthlyTdsRequired)}</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {taxProjection.notes.map((note, idx) => (
                  <li key={idx}>• {note}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowTaxModal(false)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Payroll;
