import mongoose from 'mongoose';

// ===== ENHANCED SALARY COMPONENT MODEL (Story 8.1) =====
const salaryComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['earning', 'deduction'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'basic', 'hra', 'conveyance', 'medical', 'special', 'bonus', 
      'overtime', 'incentive', 'reimbursement', 'other_earning',
      'pf', 'esi', 'pt', 'tds', 'loan', 'advance', 'other_deduction'
    ],
    required: true
  },
  
  // Amount Calculation Type
  calculationType: {
    type: String,
    enum: ['fixed', 'percentage_of_basic', 'percentage_of_ctc', 'formula'],
    default: 'fixed'
  },
  defaultValue: {
    type: Number,
    default: 0
  },
  formula: {
    type: String,
    default: null // e.g., "BASIC * 0.40" or "CTC * 0.12"
  },
  
  // Taxability Rules
  taxability: {
    type: String,
    enum: ['taxable', 'partially_taxable', 'exempt'],
    default: 'taxable'
  },
  taxExemptLimit: {
    type: Number,
    default: 0 // For partially taxable (e.g., HRA exemption limit)
  },
  section: {
    type: String,
    default: null // e.g., "80C", "80D" for tax deductions
  },
  
  // Statutory Rules
  isStatutory: {
    type: Boolean,
    default: false
  },
  statutoryType: {
    type: String,
    enum: ['pf_employee', 'pf_employer', 'esi_employee', 'esi_employer', 'pt', 'tds', 'lwf', 'none'],
    default: 'none'
  },
  statutoryConfig: {
    // PF Configuration
    pfBasicWageCap: { type: Number, default: 15000 }, // Basic wage cap for PF
    pfRate: { type: Number, default: 12 }, // PF contribution rate %
    
    // ESI Configuration
    esiGrossCap: { type: Number, default: 21000 }, // Gross salary cap for ESI eligibility
    esiEmployeeRate: { type: Number, default: 0.75 }, // ESI employee rate %
    esiEmployerRate: { type: Number, default: 3.25 }, // ESI employer rate %
    
    // Professional Tax
    ptSlabs: [{
      fromAmount: Number,
      toAmount: Number,
      taxAmount: Number
    }]
  },
  
  // Rounding Rules
  rounding: {
    type: String,
    enum: ['none', 'round', 'floor', 'ceil'],
    default: 'round'
  },
  roundingPrecision: {
    type: Number,
    default: 0 // 0 = nearest integer, 2 = two decimal places
  },
  
  // Constraints
  minAmount: {
    type: Number,
    default: null
  },
  maxAmount: {
    type: Number,
    default: null
  },
  
  // Flags
  isMandatory: {
    type: Boolean,
    default: false
  },
  isRecurring: {
    type: Boolean,
    default: true
  },
  affectsCtc: {
    type: Boolean,
    default: true
  },
  showInPayslip: {
    type: Boolean,
    default: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Display order
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

salaryComponentSchema.index({ code: 1 }, { unique: true });
salaryComponentSchema.index({ type: 1, isActive: 1 });

// ===== ENHANCED SALARY STRUCTURE MODEL (Story 8.1) =====
const structureComponentSchema = new mongoose.Schema({
  component: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent',
    required: true
  },
  // Override calculation for this structure
  calculationType: {
    type: String,
    enum: ['fixed', 'percentage_of_basic', 'percentage_of_ctc', 'formula', 'use_default'],
    default: 'use_default'
  },
  value: {
    type: Number,
    default: 0
  },
  formula: {
    type: String,
    default: null
  },
  isEnabled: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const salaryStructureSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['staff', 'manager', 'executive', 'intern', 'contract', 'consultant', 'custom'],
    default: 'staff'
  },
  
  // Components in this structure
  earnings: [structureComponentSchema],
  deductions: [structureComponentSchema],
  
  // Statutory Applicability
  pfApplicable: {
    type: Boolean,
    default: true
  },
  esiApplicable: {
    type: Boolean,
    default: true
  },
  ptApplicable: {
    type: Boolean,
    default: true
  },
  tdsApplicable: {
    type: Boolean,
    default: true
  },
  
  // Salary Range
  minCtc: {
    type: Number,
    default: 0
  },
  maxCtc: {
    type: Number,
    default: null
  },
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  versionGroup: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    default: () => new mongoose.Types.ObjectId()
  },
  previousVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryStructure',
    default: null
  },
  isLatest: {
    type: Boolean,
    default: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  },
  effectiveTo: {
    type: Date,
    default: null
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clonedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryStructure',
    default: null
  }
}, {
  timestamps: true
});

salaryStructureSchema.index({ code: 1, isLatest: 1 }, { unique: true, partialFilterExpression: { isLatest: true } });
salaryStructureSchema.index({ versionGroup: 1, version: 1 }, { unique: true });

// ===== ENHANCED PAYROLL RUN MODEL (Story 8.3) =====
const validationErrorSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  employeeId: String,
  employeeName: String,
  errorType: {
    type: String,
    enum: ['missing_salary_structure', 'missing_attendance', 'statutory_mismatch', 'invalid_effective_date', 'missing_ctc', 'leave_balance_issue', 'shift_mismatch', 'other']
  },
  message: String,
  severity: {
    type: String,
    enum: ['error', 'warning'],
    default: 'error'
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: true });

const payrollSummarySchema = new mongoose.Schema({
  totalGrossEarnings: { type: Number, default: 0 },
  totalGrossDeductions: { type: Number, default: 0 },
  totalNetPay: { type: Number, default: 0 },
  totalEmployerContributions: { type: Number, default: 0 },
  
  // Statutory Totals
  pfEmployeeTotal: { type: Number, default: 0 },
  pfEmployerTotal: { type: Number, default: 0 },
  esiEmployeeTotal: { type: Number, default: 0 },
  esiEmployerTotal: { type: Number, default: 0 },
  ptTotal: { type: Number, default: 0 },
  tdsTotal: { type: Number, default: 0 },
  
  // Special Adjustments
  lopTotal: { type: Number, default: 0 },
  overtimeTotal: { type: Number, default: 0 },
  shiftAllowanceTotal: { type: Number, default: 0 },
  arrearsTotal: { type: Number, default: 0 },
  
  // Employee Counts
  processedCount: { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 }
}, { _id: false });

const payrollRunSchema = new mongoose.Schema({
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'validating', 'validated', 'processing', 'completed', 'locked', 'cancelled'],
    default: 'draft'
  },
  
  // Validation Results
  validationErrors: [validationErrorSchema],
  validationRun: {
    ranAt: Date,
    ranBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    totalChecked: { type: Number, default: 0 },
    passed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 }
  },
  
  // Processing Info
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  
  // Summary
  summary: payrollSummarySchema,
  
  // Employee counts
  totalEmployees: {
    type: Number,
    default: 0
  },
  eligibleEmployees: {
    type: Number,
    default: 0
  },
  excludedEmployees: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    reason: String
  }],
  
  // Financial Summary
  totalAmount: {
    type: Number,
    default: 0
  },
  bankTransferTotal: {
    type: Number,
    default: 0
  },
  
  // Locking
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: Date,
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lockReason: String,
  
  // Payslip Generation
  payslipsGenerated: {
    type: Boolean,
    default: false
  },
  payslipGeneratedAt: Date,
  
  // Reports
  reportsGenerated: [{
    type: {
      type: String,
      enum: ['bank_transfer', 'pf_report', 'esi_report', 'pt_report', 'salary_register', 'journal_voucher']
    },
    generatedAt: Date,
    filePath: String
  }],
  
  // Remarks
  remarks: String,
  
  // Audit
  history: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

payrollRunSchema.index({ month: 1, year: 1 }, { unique: true });
payrollRunSchema.index({ status: 1 });
payrollRunSchema.index({ isLocked: 1 });

// ===== ENHANCED PAYSLIP MODEL (Story 8.3) =====
const earningItemSchema = new mongoose.Schema({
  componentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent'
  },
  name: { type: String, required: true },
  code: String,
  type: { type: String, enum: ['regular', 'overtime', 'shift_allowance', 'arrears', 'bonus', 'reimbursement', 'other'] },
  amount: { type: Number, required: true },
  calculatedFrom: String, // e.g., "40% of CTC"
  taxability: { type: String, enum: ['taxable', 'partially_taxable', 'exempt'] }
}, { _id: false });

const deductionItemSchema = new mongoose.Schema({
  componentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryComponent'
  },
  name: { type: String, required: true },
  code: String,
  type: { type: String, enum: ['regular', 'statutory', 'loan', 'advance', 'lop', 'other'] },
  amount: { type: Number, required: true },
  isStatutory: { type: Boolean, default: false },
  statutoryType: String
}, { _id: false });

const employerContributionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: String,
  amount: { type: Number, required: true },
  statutoryType: String
}, { _id: false });

const attendanceSummarySchema = new mongoose.Schema({
  totalDays: { type: Number, default: 0 },
  workingDays: { type: Number, default: 0 },
  presentDays: { type: Number, default: 0 },
  absentDays: { type: Number, default: 0 },
  paidLeaveDays: { type: Number, default: 0 },
  unpaidLeaveDays: { type: Number, default: 0 },
  lopDays: { type: Number, default: 0 },
  holidays: { type: Number, default: 0 },
  weekOffs: { type: Number, default: 0 },
  halfDays: { type: Number, default: 0 },
  lateDays: { type: Number, default: 0 },
  earlyLeaveDays: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  totalWorkingHours: { type: Number, default: 0 },
  expectedWorkingHours: { type: Number, default: 0 }
}, { _id: false });

const payslipSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  payrollRun: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollRun',
    required: true
  },
  
  // Period Info
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  periodStart: Date,
  periodEnd: Date,
  
  // Employee Snapshot (at time of payroll)
  employeeSnapshot: {
    employeeId: String,
    name: String,
    email: String,
    department: String,
    designation: String,
    joiningDate: Date,
    bankDetails: {
      accountNumber: String,
      bankName: String,
      ifscCode: String,
      accountHolderName: String
    },
    panNumber: String,
    uanNumber: String,
    esiNumber: String
  },
  
  // Salary Structure Used
  salaryStructure: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalaryStructure'
  },
  salaryStructureName: String,
  ctc: { type: Number, required: true },
  monthlyGross: { type: Number, required: true },
  
  // Attendance Summary
  attendance: attendanceSummarySchema,
  
  // Earnings Breakdown
  basicSalary: {
    type: Number,
    required: true
  },
  earnings: [earningItemSchema],
  totalEarnings: {
    type: Number,
    required: true
  },
  
  // Special Adjustments
  adjustments: {
    lopDeduction: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    shiftAllowance: { type: Number, default: 0 },
    arrears: { type: Number, default: 0 },
    arrearsDetails: {
      fromMonth: Number,
      toMonth: Number,
      reason: String,
      previousCtc: Number,
      newCtc: Number
    },
    otherAdjustments: [{
      description: String,
      amount: Number,
      type: { type: String, enum: ['addition', 'deduction'] }
    }]
  },
  
  // Deductions Breakdown
  deductions: [deductionItemSchema],
  totalDeductions: {
    type: Number,
    required: true
  },
  
  // Employer Contributions (not deducted from employee)
  employerContributions: [employerContributionSchema],
  totalEmployerContributions: { type: Number, default: 0 },
  
  // Statutory Details
  statutory: {
    pfEmployee: { type: Number, default: 0 },
    pfEmployer: { type: Number, default: 0 },
    pensionContribution: { type: Number, default: 0 },
    esiEmployee: { type: Number, default: 0 },
    esiEmployer: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    lwf: { type: Number, default: 0 }
  },
  
  // Final Calculations
  grossSalary: {
    type: Number,
    required: true
  },
  netSalary: {
    type: Number,
    required: true
  },
  
  // Payment Info
  paymentMode: {
    type: String,
    enum: ['bank_transfer', 'cheque', 'cash'],
    default: 'bank_transfer'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processed', 'paid', 'failed'],
    default: 'pending'
  },
  paymentDate: Date,
  transactionReference: String,
  
  // Documents
  pdfPath: String,
  htmlPath: String,
  signedPdfPath: String,
  
  // YTD Summary
  ytdSummary: {
    grossEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    pfContribution: { type: Number, default: 0 },
    taxDeducted: { type: Number, default: 0 }
  },
  
  // Flags
  isFinalized: { type: Boolean, default: false },
  finalizedAt: Date,
  
  // Audit
  remarks: String,
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

payslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
payslipSchema.index({ payrollRun: 1 });
payslipSchema.index({ 'employeeSnapshot.employeeId': 1 });
payslipSchema.index({ paymentStatus: 1 });

export const SalaryComponent = mongoose.model('SalaryComponent', salaryComponentSchema);
export const SalaryStructure = mongoose.model('SalaryStructure', salaryStructureSchema);
export const PayrollRun = mongoose.model('PayrollRun', payrollRunSchema);
export const Payslip = mongoose.model('Payslip', payslipSchema);

