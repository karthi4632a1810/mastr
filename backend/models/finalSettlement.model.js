import mongoose from 'mongoose';

const settlementComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['earning', 'deduction'],
    required: true
  },
  category: {
    type: String,
    enum: ['leave_encashment', 'gratuity', 'bonus', 'reimbursement', 'salary_days_worked', 'notice_period_buyout', 'asset_recovery', 'salary_advance', 'loan', 'lop_adjustment', 'notice_period_shortfall', 'document_recovery', 'statutory', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  description: {
    type: String,
    default: ''
  },
  calculationDetails: {
    type: String,
    default: ''
  }
}, { _id: true });

const finalSettlementSchema = new mongoose.Schema({
  resignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resignation',
    required: true,
    unique: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  lastWorkingDate: {
    type: Date,
    required: true
  },
  settlementMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  settlementYear: {
    type: Number,
    required: true
  },
  // Payable Components
  payableComponents: [settlementComponentSchema],
  grossPayable: {
    type: Number,
    default: 0
  },
  // Recovery Components
  recoveryComponents: [settlementComponentSchema],
  totalRecoveries: {
    type: Number,
    default: 0
  },
  // Statutory Deductions
  statutoryDeductions: {
    pf: {
      type: Number,
      default: 0
    },
    esi: {
      type: Number,
      default: 0
    },
    pt: {
      type: Number,
      default: 0
    },
    tds: {
      type: Number,
      default: 0
    },
    other: {
      type: Number,
      default: 0
    }
  },
  totalStatutoryDeductions: {
    type: Number,
    default: 0
  },
  // Final Calculations
  netSettlementAmount: {
    type: Number,
    default: 0
  },
  // Payroll Integration
  linkedPayroll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payslip',
    default: null
  },
  lastPayrollRun: {
    type: Date,
    default: null
  },
  salaryDaysWorked: {
    type: Number,
    default: 0
  },
  proratedSalary: {
    type: Number,
    default: 0
  },
  // Finance Processing
  status: {
    type: String,
    enum: ['draft', 'prepared', 'verified', 'paid', 'cancelled'],
    default: 'draft'
  },
  preparedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  preparedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  paymentDetails: {
    paymentDate: {
      type: Date,
      default: null
    },
    bankReferenceNumber: {
      type: String,
      default: ''
    },
    transactionId: {
      type: String,
      default: ''
    },
    paymentMode: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'cash', 'other'],
      default: null
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  // PDF Generation
  settlementSheetPath: {
    type: String,
    default: null
  },
  generatedAt: {
    type: Date,
    default: null
  },
  // Notes and approvals
  notes: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
// resignation already has unique: true in schema definition above
finalSettlementSchema.index({ employee: 1 });
finalSettlementSchema.index({ status: 1 });
finalSettlementSchema.index({ settlementYear: 1, settlementMonth: 1 });

// Pre-save hook to calculate totals
finalSettlementSchema.pre('save', function(next) {
  // Calculate gross payable
  this.grossPayable = this.payableComponents.reduce((sum, comp) => {
    return sum + (comp.type === 'earning' ? comp.amount : 0);
  }, 0);

  // Calculate total recoveries
  this.totalRecoveries = this.recoveryComponents.reduce((sum, comp) => {
    return sum + (comp.type === 'deduction' ? comp.amount : 0);
  }, 0);

  // Calculate total statutory deductions
  this.totalStatutoryDeductions = 
    this.statutoryDeductions.pf +
    this.statutoryDeductions.esi +
    this.statutoryDeductions.pt +
    this.statutoryDeductions.tds +
    this.statutoryDeductions.other;

  // Calculate net settlement
  this.netSettlementAmount = 
    this.grossPayable - 
    this.totalRecoveries - 
    this.totalStatutoryDeductions;

  next();
});

export default mongoose.model('FinalSettlement', finalSettlementSchema);

