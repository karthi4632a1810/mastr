import express from 'express';
import {
  // Salary Components
  getSalaryComponents,
  getSalaryComponent,
  createSalaryComponent,
  updateSalaryComponent,
  deleteSalaryComponent,
  // Salary Structures
  getSalaryStructures,
  getSalaryStructure,
  createSalaryStructure,
  updateSalaryStructure,
  cloneSalaryStructure,
  deleteSalaryStructure,
  getStructureVersionHistory,
  // Salary Calculation
  calculateSalaryPreview,
  getStatutoryConfig,
  seedDefaultComponents,
  // Salary Assignment (Story 8.2)
  assignSalaryStructure,
  processIncrement,
  getEmployeeSalaryDetails,
  getEmployeesWithoutSalary,
  bulkAssignSalaryStructure,
  recalculateEmployeeSalary,
  // Payroll Processing (Story 8.3)
  getPayrollRuns,
  getPayrollRunDetails,
  createPayrollRun,
  runPrePayrollValidation,
  resolveValidationError,
  processPayroll,
  lockPayroll,
  getPayslips,
  getPayslipDetails,
  generatePayslipHtml,
  generatePayrollReports,
  getPayrollDashboard,
  // Employee Payslip (Story 8.4)
  getMyPayslips,
  getMyPayslipDetails,
  getMyYtdSummary,
  comparePayslips,
  getMyTaxProjection,
  emailPayslipToSelf,
  generateSecurePayslipHtml,
  // Payroll Reports (Story 8.5)
  getSalaryRegisterReport,
  getDepartmentWiseReport,
  getStatutoryReport,
  getVarianceAnalysisReport,
  getOvertimeShiftReport,
  // Arrears & Retro Pay (Story 8.6)
  calculateArrears,
  processArrears,
  getPendingArrears,
  // Full & Final Settlement (Story 8.7)
  createSettlement,
  finalizeSettlement,
  getSettlementPreview
} from '../controllers/payroll.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// ===== Salary Components =====
router.get('/components', authenticate, authorize('admin', 'hr'), getSalaryComponents);
router.get('/components/:id', authenticate, authorize('admin', 'hr'), getSalaryComponent);
router.post('/components', authenticate, authorize('admin', 'hr'), createSalaryComponent);
router.put('/components/:id', authenticate, authorize('admin', 'hr'), updateSalaryComponent);
router.delete('/components/:id', authenticate, authorize('admin', 'hr'), deleteSalaryComponent);
router.post('/components/seed', authenticate, authorize('admin'), seedDefaultComponents);

// ===== Salary Structures =====
router.get('/structures', authenticate, authorize('admin', 'hr'), getSalaryStructures);
router.get('/structures/:id', authenticate, authorize('admin', 'hr'), getSalaryStructure);
router.post('/structures', authenticate, authorize('admin', 'hr'), createSalaryStructure);
router.put('/structures/:id', authenticate, authorize('admin', 'hr'), updateSalaryStructure);
router.post('/structures/:id/clone', authenticate, authorize('admin', 'hr'), cloneSalaryStructure);
router.delete('/structures/:id', authenticate, authorize('admin', 'hr'), deleteSalaryStructure);
router.get('/structures/:id/versions', authenticate, authorize('admin', 'hr'), getStructureVersionHistory);

// ===== Salary Calculation =====
router.post('/calculate-preview', authenticate, authorize('admin', 'hr'), calculateSalaryPreview);
router.get('/statutory-config', authenticate, authorize('admin', 'hr'), getStatutoryConfig);

// ===== Salary Assignment (Story 8.2) =====
router.get('/employees/without-salary', authenticate, authorize('admin', 'hr'), getEmployeesWithoutSalary);
router.get('/employees/:employeeId/salary', authenticate, authorize('admin', 'hr'), getEmployeeSalaryDetails);
router.post('/employees/:employeeId/assign-structure', authenticate, authorize('admin', 'hr'), assignSalaryStructure);
router.post('/employees/:employeeId/increment', authenticate, authorize('admin', 'hr'), processIncrement);
router.post('/employees/:employeeId/recalculate', authenticate, authorize('admin', 'hr'), recalculateEmployeeSalary);
router.post('/employees/bulk-assign', authenticate, authorize('admin', 'hr'), bulkAssignSalaryStructure);

// ===== Payroll Dashboard (Story 8.3) =====
router.get('/dashboard', authenticate, authorize('admin', 'hr'), getPayrollDashboard);

// ===== Payroll Runs (Story 8.3) =====
router.get('/runs', authenticate, authorize('admin', 'hr'), getPayrollRuns);
router.get('/runs/:id', authenticate, authorize('admin', 'hr'), getPayrollRunDetails);
router.post('/runs', authenticate, authorize('admin', 'hr'), createPayrollRun);
router.post('/runs/:id/validate', authenticate, authorize('admin', 'hr'), runPrePayrollValidation);
router.put('/runs/:id/errors/:errorId/resolve', authenticate, authorize('admin', 'hr'), resolveValidationError);
router.post('/runs/:id/process', authenticate, authorize('admin', 'hr'), processPayroll);
router.post('/runs/:id/lock', authenticate, authorize('admin', 'hr'), lockPayroll);
router.post('/runs/:id/reports', authenticate, authorize('admin', 'hr'), generatePayrollReports);

// ===== Payslips (Story 8.3) =====
router.get('/payslips', authenticate, getPayslips);
router.get('/payslips/:id', authenticate, getPayslipDetails);
router.get('/payslips/:id/html', authenticate, generatePayslipHtml);

// ===== Employee Payslip Routes (Story 8.4) =====
router.get('/my/payslips', authenticate, authorize('employee'), getMyPayslips);
router.get('/my/payslips/:id', authenticate, authorize('employee'), getMyPayslipDetails);
router.get('/my/payslips/:id/secure-html', authenticate, authorize('employee'), generateSecurePayslipHtml);
router.post('/my/payslips/:id/email', authenticate, authorize('employee'), emailPayslipToSelf);
router.get('/my/ytd-summary', authenticate, authorize('employee'), getMyYtdSummary);
router.get('/my/compare', authenticate, authorize('employee'), comparePayslips);
router.get('/my/tax-projection', authenticate, authorize('employee'), getMyTaxProjection);

// ===== Payroll Reports (Story 8.5) =====
router.get('/reports/salary-register', authenticate, authorize('admin', 'hr'), getSalaryRegisterReport);
router.get('/reports/department-wise', authenticate, authorize('admin', 'hr'), getDepartmentWiseReport);
router.get('/reports/statutory', authenticate, authorize('admin', 'hr'), getStatutoryReport);
router.get('/reports/variance', authenticate, authorize('admin', 'hr'), getVarianceAnalysisReport);
router.get('/reports/overtime-shift', authenticate, authorize('admin', 'hr'), getOvertimeShiftReport);

// ===== Arrears & Retro Pay (Story 8.6) =====
router.get('/arrears/pending', authenticate, authorize('admin', 'hr'), getPendingArrears);
router.post('/arrears/calculate', authenticate, authorize('admin', 'hr'), calculateArrears);
router.post('/arrears/process', authenticate, authorize('admin', 'hr'), processArrears);

// ===== Full & Final Settlement (Story 8.7) =====
router.get('/settlement/:employeeId/preview', authenticate, authorize('admin', 'hr'), getSettlementPreview);
router.post('/settlement/create', authenticate, authorize('admin', 'hr'), createSettlement);
router.post('/settlement/finalize', authenticate, authorize('admin', 'hr'), finalizeSettlement);

export default router;
