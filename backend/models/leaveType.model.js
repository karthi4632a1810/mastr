import mongoose from 'mongoose';

const leaveTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, uppercase: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'general' }, // e.g., CL, SL, EL, MAT, PAT, COMP_OFF, LOP
  isPaid: { type: Boolean, default: true },
  maxDays: { type: Number, default: 0 }, // annual/quota cap for the leave type

  rules: {
    accrual: {
      frequency: { type: String, enum: ['none', 'monthly', 'quarterly', 'yearly'], default: 'none' },
      ratePerCycle: { type: Number, default: 0 }, // days per cycle
      prorated: { type: Boolean, default: false },
      startFrom: { type: String, enum: ['joining', 'fiscal_year'], default: 'joining' },
      fiscalYearStartMonth: { type: Number, min: 1, max: 12, default: 4 }
    },
    carryForward: {
      enabled: { type: Boolean, default: false },
      maxDays: { type: Number, default: 0 },
      expiresAfterMonths: { type: Number, default: 0 },
      autoConvertToLop: { type: Boolean, default: false },
      encashable: { type: Boolean, default: false }
    },
    encashment: {
      enabled: { type: Boolean, default: false },
      eligibilityMonths: { type: Number, default: 0 },
      maxEncashable: { type: Number, default: 0 },
      formula: { type: String, default: '' } // placeholder for payroll integration
    },
    usage: {
      minDays: { type: Number, default: 0 },
      maxDaysPerRequest: { type: Number, default: 0 },
      blockDuringProbation: { type: Boolean, default: false },
      blockDuringNoticePeriod: { type: Boolean, default: false },
      allowHalfDay: { type: Boolean, default: false },
      allowHourly: { type: Boolean, default: false },
      maxHoursPerRequest: { type: Number, default: 0 },
      requiresDocument: { type: Boolean, default: false },
      mandatoryDocumentTypes: [{ type: String }],
      defaultReason: { type: String, default: '' }
    }
  },

  requiresApproval: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },

  version: { type: Number, default: 1 },
  versionGroup: { type: mongoose.Schema.Types.ObjectId, index: true, default: () => new mongoose.Types.ObjectId() },
  previousVersion: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', default: null },
  isLatest: { type: Boolean, default: true }
}, { timestamps: true });

leaveTypeSchema.index({ code: 1, isLatest: 1 }, { unique: true, partialFilterExpression: { isLatest: true } });
leaveTypeSchema.index({ name: 1, isLatest: 1 }, { unique: true, partialFilterExpression: { isLatest: true } });
leaveTypeSchema.index({ versionGroup: 1, version: 1 }, { unique: true });

export default mongoose.model('LeaveType', leaveTypeSchema);
