import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';
import { 
  UserMinus, 
  Calendar, 
  DollarSign, 
  Clock,
  Award,
  FileText,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  Printer,
  Building,
  Briefcase
} from 'lucide-react';

const FullFinalSettlement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formData, setFormData] = useState({
    lastWorkingDate: '',
    separationType: 'resignation',
    noticePeriodDays: 30,
    noticePeriodServed: 30,
    remarks: ''
  });

  // Fetch active employees
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['active-employees'],
    queryFn: () => api.get('/employees?status=active').then(res => res.data.data)
  });

  // Create settlement calculation
  const calculateMutation = useMutation({
    mutationFn: (data) => api.post('/payroll/settlement/create', data),
    onSuccess: (response) => {
      setSettlementData(response.data.data);
      setShowSettlementModal(true);
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to calculate settlement', 'error');
    }
  });

  // Finalize settlement
  const finalizeMutation = useMutation({
    mutationFn: (data) => api.post('/payroll/settlement/finalize', data),
    onSuccess: () => {
      showToast('Settlement finalized successfully', 'success');
      setShowSettlementModal(false);
      setShowConfirmModal(false);
      setSelectedEmployee(null);
      setSettlementData(null);
      queryClient.invalidateQueries(['active-employees']);
    },
    onError: (error) => {
      showToast(error.response?.data?.message || 'Failed to finalize settlement', 'error');
    }
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleCalculate = () => {
    if (!selectedEmployee || !formData.lastWorkingDate) {
      showToast('Please select employee and last working date', 'error');
      return;
    }

    calculateMutation.mutate({
      employeeId: selectedEmployee._id,
      ...formData
    });
  };

  const handleFinalize = () => {
    finalizeMutation.mutate({
      employeeId: selectedEmployee._id,
      settlementData
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const separationTypes = [
    { value: 'resignation', label: 'Resignation' },
    { value: 'termination', label: 'Termination' },
    { value: 'retirement', label: 'Retirement' },
    { value: 'absconding', label: 'Absconding' },
    { value: 'mutual', label: 'Mutual Separation' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Full & Final Settlement</h1>
        <p className="text-gray-500 mt-1">Calculate and process employee separation settlements</p>
      </div>

      {/* Employee Selection and Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settlement Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
            <select
              value={selectedEmployee?._id || ''}
              onChange={(e) => {
                const emp = employees?.find(emp => emp._id === e.target.value);
                setSelectedEmployee(emp);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an employee...</option>
              {employees?.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.employeeId} - {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Separation Type</label>
            <select
              value={formData.separationType}
              onChange={(e) => setFormData({ ...formData, separationType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {separationTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Date</label>
            <input
              type="date"
              value={formData.lastWorkingDate}
              onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (Days)</label>
            <input
              type="number"
              value={formData.noticePeriodDays}
              onChange={(e) => setFormData({ ...formData, noticePeriodDays: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period Served (Days)</label>
            <input
              type="number"
              value={formData.noticePeriodServed}
              onChange={(e) => setFormData({ ...formData, noticePeriodServed: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Optional remarks..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Selected Employee Info */}
        {selectedEmployee && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">Employee Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Employee ID</p>
                <p className="font-medium">{selectedEmployee.employeeId}</p>
              </div>
              <div>
                <p className="text-gray-500">Name</p>
                <p className="font-medium">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
              </div>
              <div>
                <p className="text-gray-500">Department</p>
                <p className="font-medium">{selectedEmployee.department?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Joining Date</p>
                <p className="font-medium">{new Date(selectedEmployee.joiningDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500">CTC</p>
                <p className="font-medium">{formatCurrency(selectedEmployee.ctc)}</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Gross</p>
                <p className="font-medium">{formatCurrency(selectedEmployee.ctc / 12)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button 
            onClick={handleCalculate}
            disabled={!selectedEmployee || !formData.lastWorkingDate || calculateMutation.isPending}
          >
            {calculateMutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Calculating...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Calculate Settlement
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settlement Preview Modal */}
      <Modal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        title="Full & Final Settlement"
        size="xl"
      >
        {settlementData && (
          <div className="space-y-6 print:space-y-4">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h2 className="text-xl font-bold text-gray-900">Full & Final Settlement Statement</h2>
              <p className="text-gray-500">
                {settlementData.employee.separationType?.charAt(0).toUpperCase() + settlementData.employee.separationType?.slice(1)}
              </p>
            </div>

            {/* Employee Details */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Employee</p>
                <p className="font-semibold">{settlementData.employee.name}</p>
                <p className="text-sm text-gray-600">{settlementData.employee.employeeId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-semibold">{settlementData.employee.department}</p>
                <p className="text-sm text-gray-600">{settlementData.employee.designation}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Joining Date</p>
                <p className="font-semibold">{new Date(settlementData.employee.joiningDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Working Date</p>
                <p className="font-semibold">{new Date(settlementData.employee.lastWorkingDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Service</p>
                <p className="font-semibold">{settlementData.service.totalYears} years ({settlementData.service.totalDays} days)</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CTC</p>
                <p className="font-semibold">{formatCurrency(settlementData.salary.ctc)}</p>
              </div>
            </div>

            {/* Earnings and Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-green-50 px-4 py-2 border-b">
                  <h3 className="font-semibold text-green-800">Earnings</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending Salary ({settlementData.earnings.pendingSalaryDays} days)</span>
                    <span className="font-medium">{formatCurrency(settlementData.earnings.pendingSalary)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Leave Encashment</span>
                    <span className="font-medium">{formatCurrency(settlementData.earnings.leaveEncashment.total)}</span>
                  </div>
                  {settlementData.earnings.leaveEncashment.details?.length > 0 && (
                    <div className="pl-4 text-sm text-gray-500">
                      {settlementData.earnings.leaveEncashment.details.map((le, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{le.leaveType} ({le.encashableDays} days)</span>
                          <span>{formatCurrency(le.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Gratuity</span>
                      {settlementData.earnings.gratuity.eligible ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-xs text-orange-600">(Requires 5+ years)</span>
                      )}
                    </div>
                    <span className="font-medium">{formatCurrency(settlementData.earnings.gratuity.amount)}</span>
                  </div>

                  {settlementData.earnings.noticePeriod.payout > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Notice Period Pay</span>
                      <span className="font-medium">{formatCurrency(settlementData.earnings.noticePeriod.payout)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t font-semibold text-green-700">
                    <span>Total Earnings</span>
                    <span>{formatCurrency(settlementData.earnings.totalEarnings)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-2 border-b">
                  <h3 className="font-semibold text-red-800">Deductions</h3>
                </div>
                <div className="p-4 space-y-3">
                  {settlementData.deductions.noticePeriodRecovery > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Notice Period Recovery ({settlementData.deductions.noticePeriodShortfall} days)</span>
                      <span className="font-medium text-red-600">{formatCurrency(settlementData.deductions.noticePeriodRecovery)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">PF Contribution</span>
                    <span className="font-medium">{formatCurrency(settlementData.deductions.pfDeduction)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">ESI Contribution</span>
                    <span className="font-medium">{formatCurrency(settlementData.deductions.esiDeduction)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Professional Tax</span>
                    <span className="font-medium">{formatCurrency(settlementData.deductions.professionalTax)}</span>
                  </div>

                  {settlementData.deductions.pendingRecoveries > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pending Recoveries</span>
                      <span className="font-medium">{formatCurrency(settlementData.deductions.pendingRecoveries)}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t font-semibold text-red-700">
                    <span>Total Deductions</span>
                    <span>{formatCurrency(settlementData.deductions.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Settlement */}
            <div className={`p-6 rounded-lg text-center ${
              settlementData.netSettlement >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <p className="text-sm text-gray-600 mb-1">Net Settlement Amount</p>
              <p className={`text-3xl font-bold ${
                settlementData.netSettlement >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                {formatCurrency(settlementData.netSettlement)}
              </p>
              {settlementData.netSettlement < 0 && (
                <p className="text-sm text-red-600 mt-2">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Amount to be recovered from employee
                </p>
              )}
            </div>

            {/* Gratuity Info */}
            {settlementData.earnings.gratuity.eligible && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <Award className="w-5 h-5" />
                  <span className="font-semibold">Gratuity Details</span>
                </div>
                <p className="text-sm text-blue-700">
                  Based on {settlementData.earnings.gratuity.serviceYears} years of service.
                  Formula: (15 × Last Drawn Basic × Years of Service) ÷ 26
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t print:hidden">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowSettlementModal(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowConfirmModal(true)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalize Settlement
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Settlement"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Are you sure you want to finalize this settlement?</p>
              <p className="text-sm text-yellow-700">This action will:</p>
            </div>
          </div>

          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-4">
            <li>Mark the employee as inactive</li>
            <li>Create a final payslip with settlement amount</li>
            <li>Record the separation in employee history</li>
            <li>This action cannot be undone</li>
          </ul>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFinalize}
              disabled={finalizeMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {finalizeMutation.isPending ? 'Processing...' : 'Confirm & Finalize'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FullFinalSettlement;

