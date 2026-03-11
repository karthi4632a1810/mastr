import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { 
  FileText, 
  Download, 
  Building, 
  Users, 
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  DollarSign,
  Clock,
  Shield,
  BarChart3,
  PieChart,
  Filter,
  Printer,
  RefreshCw
} from 'lucide-react';

const PayrollReports = () => {
  const { showToast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [filters, setFilters] = useState({
    month: currentMonth,
    year: currentYear,
    month2: currentMonth > 1 ? currentMonth - 1 : 12,
    year2: currentMonth > 1 ? currentYear : currentYear - 1,
    department: '',
    statutoryType: 'pf'
  });

  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const reports = [
    { id: 'salary-register', name: 'Salary Register', icon: FileText, description: 'Complete salary breakdown for all employees' },
    { id: 'department-wise', name: 'Department-wise Payroll', icon: Building, description: 'Payroll summary grouped by department' },
    { id: 'statutory-pf', name: 'PF Report', icon: Shield, description: 'Provident Fund contribution details' },
    { id: 'statutory-esi', name: 'ESI Report', icon: Shield, description: 'ESI contribution details' },
    { id: 'statutory-pt', name: 'Professional Tax Report', icon: DollarSign, description: 'Professional Tax deduction report' },
    { id: 'statutory-tds', name: 'TDS Report', icon: Shield, description: 'Tax Deducted at Source report' },
    { id: 'variance', name: 'Variance Analysis', icon: BarChart3, description: 'Month-over-month payroll comparison' },
    { id: 'overtime-shift', name: 'Overtime & Shift Allowance', icon: Clock, description: 'Overtime and shift allowance report' },
  ];

  // Fetch report data
  const fetchReport = async () => {
    try {
      let endpoint = '';
      let params = { month: filters.month, year: filters.year };

      switch (selectedReport) {
        case 'salary-register':
          endpoint = '/payroll/reports/salary-register';
          if (filters.department) params.departmentId = filters.department;
          break;
        case 'department-wise':
          endpoint = '/payroll/reports/department-wise';
          break;
        case 'statutory-pf':
          endpoint = '/payroll/reports/statutory';
          params.type = 'pf';
          break;
        case 'statutory-esi':
          endpoint = '/payroll/reports/statutory';
          params.type = 'esi';
          break;
        case 'statutory-pt':
          endpoint = '/payroll/reports/statutory';
          params.type = 'pt';
          break;
        case 'statutory-tds':
          endpoint = '/payroll/reports/statutory';
          params.type = 'tds';
          break;
        case 'variance':
          endpoint = '/payroll/reports/variance';
          params = { 
            month1: filters.month2, year1: filters.year2,
            month2: filters.month, year2: filters.year
          };
          break;
        case 'overtime-shift':
          endpoint = '/payroll/reports/overtime-shift';
          break;
        default:
          return;
      }

      const response = await api.get(endpoint, { params });
      setReportData(response.data.data);
      showToast('Report generated successfully', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to generate report', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (selectedReport) {
      case 'salary-register':
        return (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600">Total Employees</p>
                <p className="text-2xl font-bold text-blue-800">{reportData.summary.totalEmployees}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600">Total Gross</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(reportData.summary.totalGross)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600">Total Deductions</p>
                <p className="text-2xl font-bold text-red-800">{formatCurrency(reportData.summary.totalDeductions)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-600">Net Payable</p>
                <p className="text-2xl font-bold text-purple-800">{formatCurrency(reportData.summary.totalNet)}</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Emp ID</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-right">Working Days</th>
                    <th className="px-3 py-2 text-right">Present</th>
                    <th className="px-3 py-2 text-right">LOP</th>
                    <th className="px-3 py-2 text-right">Basic</th>
                    <th className="px-3 py-2 text-right">Gross</th>
                    <th className="px-3 py-2 text-right">PF</th>
                    <th className="px-3 py-2 text-right">ESI</th>
                    <th className="px-3 py-2 text-right">PT</th>
                    <th className="px-3 py-2 text-right">Deductions</th>
                    <th className="px-3 py-2 text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{entry.employeeId}</td>
                      <td className="px-3 py-2">{entry.name}</td>
                      <td className="px-3 py-2">{entry.department}</td>
                      <td className="px-3 py-2 text-right">{entry.workingDays}</td>
                      <td className="px-3 py-2 text-right">{entry.presentDays}</td>
                      <td className="px-3 py-2 text-right text-red-600">{entry.lopDays}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(entry.basicSalary)}</td>
                      <td className="px-3 py-2 text-right text-green-600">{formatCurrency(entry.totalEarnings)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(entry.pfEmployee)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(entry.esiEmployee)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(entry.pt)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatCurrency(entry.totalDeductions)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(entry.netSalary)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'department-wise':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600">Total Departments</p>
                <p className="text-2xl font-bold text-blue-800">{reportData.summary.totalDepartments}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600">Total Employees</p>
                <p className="text-2xl font-bold text-green-800">{reportData.summary.totalEmployees}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-600">Total Payroll</p>
                <p className="text-2xl font-bold text-purple-800">{formatCurrency(reportData.summary.totalPayroll)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportData.departments.map((dept, idx) => (
                <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{dept.department}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {dept.employeeCount} employees
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Total Gross</p>
                      <p className="font-medium text-green-600">{formatCurrency(dept.totalGross)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Net</p>
                      <p className="font-medium text-blue-600">{formatCurrency(dept.totalNet)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total PF</p>
                      <p className="font-medium">{formatCurrency(dept.totalPf)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Avg Salary</p>
                      <p className="font-medium">{formatCurrency(dept.avgSalary)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'statutory-pf':
      case 'statutory-esi':
      case 'statutory-pt':
      case 'statutory-tds':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600">Total Employees</p>
                <p className="text-2xl font-bold text-blue-800">{reportData.totals.totalEmployees}</p>
              </div>
              {reportData.totals.employeeContribution !== undefined && (
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-600">Employee Contribution</p>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(reportData.totals.employeeContribution)}</p>
                </div>
              )}
              {reportData.totals.employerContribution !== undefined && (
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-purple-600">Employer Contribution</p>
                  <p className="text-2xl font-bold text-purple-800">{formatCurrency(reportData.totals.employerContribution)}</p>
                </div>
              )}
              {reportData.totals.totalContribution !== undefined && (
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-orange-600">Total Contribution</p>
                  <p className="text-2xl font-bold text-orange-800">{formatCurrency(reportData.totals.totalContribution)}</p>
                </div>
              )}
              {reportData.totals.totalPt !== undefined && (
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-600">Total PT</p>
                  <p className="text-2xl font-bold text-red-800">{formatCurrency(reportData.totals.totalPt)}</p>
                </div>
              )}
              {reportData.totals.totalTds !== undefined && (
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-600">Total TDS</p>
                  <p className="text-2xl font-bold text-red-800">{formatCurrency(reportData.totals.totalTds)}</p>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Emp ID</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    {selectedReport === 'statutory-pf' && <th className="px-3 py-2 text-left">UAN</th>}
                    {selectedReport === 'statutory-esi' && <th className="px-3 py-2 text-left">ESI No.</th>}
                    {selectedReport === 'statutory-tds' && <th className="px-3 py-2 text-left">PAN</th>}
                    <th className="px-3 py-2 text-right">Gross Wages</th>
                    {selectedReport === 'statutory-pf' && (
                      <>
                        <th className="px-3 py-2 text-right">PF Wages</th>
                        <th className="px-3 py-2 text-right">Employee</th>
                        <th className="px-3 py-2 text-right">Employer</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </>
                    )}
                    {selectedReport === 'statutory-esi' && (
                      <>
                        <th className="px-3 py-2 text-right">Employee</th>
                        <th className="px-3 py-2 text-right">Employer</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </>
                    )}
                    {selectedReport === 'statutory-pt' && <th className="px-3 py-2 text-right">PT Amount</th>}
                    {selectedReport === 'statutory-tds' && <th className="px-3 py-2 text-right">TDS Deducted</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{entry.employeeId}</td>
                      <td className="px-3 py-2">{entry.name}</td>
                      {selectedReport === 'statutory-pf' && <td className="px-3 py-2">{entry.uanNumber}</td>}
                      {selectedReport === 'statutory-esi' && <td className="px-3 py-2">{entry.esiNumber}</td>}
                      {selectedReport === 'statutory-tds' && <td className="px-3 py-2">{entry.panNumber}</td>}
                      <td className="px-3 py-2 text-right">{formatCurrency(entry.grossWages || entry.grossSalary)}</td>
                      {selectedReport === 'statutory-pf' && (
                        <>
                          <td className="px-3 py-2 text-right">{formatCurrency(entry.pfWages)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(entry.employeeContribution)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(entry.employerContribution)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(entry.totalContribution)}</td>
                        </>
                      )}
                      {selectedReport === 'statutory-esi' && (
                        <>
                          <td className="px-3 py-2 text-right">{formatCurrency(entry.employeeContribution)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(entry.employerContribution)}</td>
                          <td className="px-3 py-2 text-right font-semibold">{formatCurrency(entry.totalContribution)}</td>
                        </>
                      )}
                      {selectedReport === 'statutory-pt' && <td className="px-3 py-2 text-right font-semibold">{formatCurrency(entry.ptAmount)}</td>}
                      {selectedReport === 'statutory-tds' && <td className="px-3 py-2 text-right font-semibold">{formatCurrency(entry.tdsDeducted)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'variance':
        return (
          <div className="space-y-6">
            {/* Period Comparison Header */}
            <div className="flex items-center justify-center gap-4 text-lg">
              <span className="font-semibold">{reportData.period1}</span>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <span className="font-semibold">{reportData.period2}</span>
            </div>

            {/* Summary Comparison */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(reportData.summaryComparison).map(([key, data]) => (
                <div key={key} className="border rounded-lg p-4">
                  <p className="text-sm text-gray-500 capitalize mb-2">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{key === 'employees' ? data.period1 : formatCurrency(data.period1)}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold">{key === 'employees' ? data.period2 : formatCurrency(data.period2)}</span>
                  </div>
                  <div className={`flex items-center gap-1 mt-2 ${
                    data.variance.absolute > 0 ? 'text-green-600' : data.variance.absolute < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {data.variance.absolute > 0 ? <TrendingUp className="w-4 h-4" /> : 
                     data.variance.absolute < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                    <span className="text-sm font-medium">
                      {data.variance.percentage}% 
                      ({key === 'employees' ? data.variance.absolute : formatCurrency(Math.abs(data.variance.absolute))})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Employee Variances */}
            {reportData.employeeVariances?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Significant Employee Changes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">Emp ID</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-right">Previous</th>
                        <th className="px-3 py-2 text-right">Current</th>
                        <th className="px-3 py-2 text-right">Change</th>
                        <th className="px-3 py-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {reportData.employeeVariances.slice(0, 20).map((emp, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{emp.employeeId}</td>
                          <td className="px-3 py-2">{emp.name}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(emp.period1Net)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(emp.period2Net)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${
                            emp.change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {emp.change > 0 ? '+' : ''}{formatCurrency(emp.change)} ({emp.changePercent}%)
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              emp.reason === 'New Employee' ? 'bg-green-100 text-green-700' :
                              emp.reason === 'Separated/Inactive' ? 'bg-red-100 text-red-700' :
                              emp.reason === 'Increase' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {emp.reason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case 'overtime-shift':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600">Employees</p>
                <p className="text-2xl font-bold text-blue-800">{reportData.summary.totalEmployees}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-sm text-orange-600">OT Hours</p>
                <p className="text-2xl font-bold text-orange-800">{reportData.summary.totalOvertimeHours}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600">OT Pay</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(reportData.summary.totalOvertimePay)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-600">Shift Allowance</p>
                <p className="text-2xl font-bold text-purple-800">{formatCurrency(reportData.summary.totalShiftAllowance)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Emp ID</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Department</th>
                    <th className="px-3 py-2 text-right">OT Hours</th>
                    <th className="px-3 py-2 text-right">OT Pay</th>
                    <th className="px-3 py-2 text-right">Shift Allowance</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.entries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{entry.employeeId}</td>
                      <td className="px-3 py-2">{entry.name}</td>
                      <td className="px-3 py-2">{entry.department}</td>
                      <td className="px-3 py-2 text-right">{entry.overtimeHours}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(entry.overtimePay)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(entry.shiftAllowance)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-600">{formatCurrency(entry.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Reports</h1>
          <p className="text-gray-500 mt-1">Generate and download payroll reports</p>
        </div>
      </div>

      {/* Report Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reports.map((report) => (
          <button
            key={report.id}
            onClick={() => {
              setSelectedReport(report.id);
              setReportData(null);
            }}
            className={`p-4 border rounded-lg text-left transition-all hover:shadow-md ${
              selectedReport === report.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <report.icon className={`w-5 h-5 ${
                selectedReport === report.id ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <span className="font-medium text-gray-900">{report.name}</span>
            </div>
            <p className="text-sm text-gray-500">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      {selectedReport && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Report Filters</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={filters.month}
                onChange={(e) => setFilters({ ...filters, month: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {monthNames.slice(1).map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {selectedReport === 'variance' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compare With Month</label>
                  <select
                    value={filters.month2}
                    onChange={(e) => setFilters({ ...filters, month2: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {monthNames.slice(1).map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compare With Year</label>
                  <select
                    value={filters.year2}
                    onChange={(e) => setFilters({ ...filters, year2: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={fetchReport}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
      )}

      {/* Report Output */}
      {reportData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{reportData.title}</h2>
              <p className="text-sm text-gray-500">Period: {reportData.period || `${reportData.period1} → ${reportData.period2}`}</p>
            </div>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
          <div className="p-6">
            {renderReportContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollReports;

