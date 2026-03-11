import mongoose from 'mongoose';

const infoRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  message: {
    type: String,
    required: true
  },
  response: {
    type: String,
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  }
}, { _id: false });

const escalationSchema = new mongoose.Schema({
  fromLevel: {
    type: Number,
    default: 1
  },
  toLevel: {
    type: Number,
    required: true
  },
  escalatedAt: {
    type: Date,
    default: Date.now
  },
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reason: {
    type: String,
    default: 'auto_escalation'
  }
}, { _id: false });

const leaveRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  partialDayType: {
    type: String,
    enum: ['full_day', 'half_day', 'hourly'],
    default: 'full_day'
  },
  hoursRequested: {
    type: Number,
    default: null
  },
  workingDays: {
    type: Number,
    default: 0
  },
  days: {
    type: Number,
    required: true
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayType: {
    type: String,
    enum: ['first_half', 'second_half'],
    default: null
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'info_requested'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  supportingDocument: {
    type: String,
    default: null
  },
  lopApplied: {
    type: Boolean,
    default: false
  },
  lopDays: {
    type: Number,
    default: 0
  },
  suggestedAlternativeType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    default: null
  },
  isCompOff: {
    type: Boolean,
    default: false
  },
  compOffDate: {
    type: Date,
    default: null
  },
  // Enhanced fields for Story 7.3
  infoRequests: [infoRequestSchema],
  escalationHistory: [escalationSchema],
  currentApprovalLevel: {
    type: Number,
    default: 1
  },
  escalationDueDate: {
    type: Date,
    default: null
  },
  conflicts: [{
    type: {
      type: String,
      enum: ['team_overlap', 'critical_role', 'max_team_leaves'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['warning', 'critical'],
      default: 'warning'
    },
    relatedEmployees: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }]
  }],
  approvalRemarks: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for escalation queries
leaveRequestSchema.index({ status: 1, escalationDueDate: 1 });
leaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1 });

export default mongoose.model('LeaveRequest', leaveRequestSchema);
