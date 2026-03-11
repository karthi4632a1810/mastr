import mongoose from 'mongoose';

const resignationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  tentativeLastWorkingDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    enum: [
      'better_opportunity',
      'personal_reasons',
      'relocation',
      'health_issues',
      'career_change',
      'dissatisfaction',
      'retirement',
      'other'
    ],
    required: true
  },
  reasonText: {
    type: String,
    default: ''
  },
  additionalComments: {
    type: String,
    default: ''
  },
  supportingDocuments: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'withdrawn', 'completed'],
    default: 'pending'
  },
  noticePeriodEndDate: {
    type: Date,
    default: null
  },
  expectedRelievingDate: {
    type: Date,
    default: null
  },
  noticePeriodDays: {
    type: Number,
    default: null
  },
  minimumServicePeriodMet: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
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
    default: ''
  },
  withdrawnAt: {
    type: Date,
    default: null
  },
  withdrawalReason: {
    type: String,
    default: ''
  },
  clarificationRequested: {
    type: Boolean,
    default: false
  },
  clarificationRequest: {
    type: String,
    default: ''
  },
  clarificationRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  clarificationRequestedAt: {
    type: Date,
    default: null
  },
  clarificationResponse: {
    type: String,
    default: ''
  },
  clarificationRespondedAt: {
    type: Date,
    default: null
  },
  // Audit log
  auditLog: [{
    action: {
      type: String,
      enum: ['submitted', 'approved', 'rejected', 'clarification_requested', 'clarification_responded', 'withdrawn', 'status_changed'],
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    comments: {
      type: String,
      default: ''
    },
    previousStatus: String,
    newStatus: String
  }],
  // Exit process timeline
  exitSteps: {
    resignation: {
      status: {
        type: String,
        enum: ['pending', 'completed'],
        default: 'completed'
      },
      completedAt: {
        type: Date,
        default: Date.now
      }
    },
    approval: {
      status: {
        type: String,
        enum: ['pending', 'completed', 'not_required'],
        default: 'pending'
      },
      completedAt: {
        type: Date,
        default: null
      }
    },
    clearance: {
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      completedAt: {
        type: Date,
        default: null
      }
    },
    finalSettlement: {
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      completedAt: {
        type: Date,
        default: null
      }
    }
  }
}, {
  timestamps: true
});

// Indexes
resignationSchema.index({ employee: 1, status: 1 });
resignationSchema.index({ status: 1 });
resignationSchema.index({ submittedAt: -1 });
resignationSchema.index({ tentativeLastWorkingDate: 1 });

export default mongoose.model('Resignation', resignationSchema);

