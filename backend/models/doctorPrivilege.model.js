import mongoose from 'mongoose';

const doctorPrivilegeSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  privilegeCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrivilegeCategory',
    required: true
  },
  // Privilege details
  privilegeRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PrivilegeRequest',
    default: null
  },
  // Restrictions & Conditions
  restrictions: {
    type: String,
    default: ''
  },
  conditions: {
    type: String,
    default: ''
  },
  // Validity
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validTo: {
    type: Date,
    default: null
  },
  validityPeriod: {
    type: Number, // in months
    default: 36
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'revoked', 'renewed'],
    default: 'active'
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  expiredAt: {
    type: Date,
    default: null
  },
  // Renewal
  renewalRequired: {
    type: Boolean,
    default: true
  },
  renewalDueDate: {
    type: Date,
    default: null
  },
  renewalReminderSent: {
    type: Boolean,
    default: false
  },
  // Renewal tracking
  renewalHistory: [{
    renewedFrom: Date,
    renewedTo: Date,
    renewedAt: Date,
    renewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    renewalRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrivilegeRequest'
    }
  }],
  // Suspension/Revocation
  suspension: {
    suspended: {
      type: Boolean,
      default: false
    },
    suspendedFrom: Date,
    suspendedTo: Date,
    suspendedAt: Date,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    liftedAt: Date,
    liftedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  revocation: {
    revoked: {
      type: Boolean,
      default: false
    },
    revokedAt: Date,
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  },
  // CME tracking (for renewal)
  cmeHours: {
    required: {
      type: Number,
      default: 0
    },
    completed: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  // Case log (if required)
  caseLog: {
    required: {
      type: Boolean,
      default: false
    },
    minimumCases: {
      type: Number,
      default: 0
    },
    loggedCases: {
      type: Number,
      default: 0
    },
    lastUpdated: Date
  },
  // Grant details
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  grantedAt: {
    type: Date,
    default: Date.now
  },
  grantOrderNumber: {
    type: String,
    default: ''
  },
  grantOrderFile: {
    type: String,
    default: null
  },
  // NABH compliance
  nabhClauses: [{
    type: String
  }],
  // Audit
  remarks: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
doctorPrivilegeSchema.index({ employee: 1, privilegeCategory: 1 });
doctorPrivilegeSchema.index({ employee: 1, status: 1 });
doctorPrivilegeSchema.index({ status: 1 });
doctorPrivilegeSchema.index({ validTo: 1, isExpired: 1 });
doctorPrivilegeSchema.index({ renewalDueDate: 1, renewalRequired: 1 });
doctorPrivilegeSchema.index({ 'suspension.suspended': 1 });
doctorPrivilegeSchema.index({ 'revocation.revoked': 1 });

// Pre-save middleware to calculate validity and expiration
doctorPrivilegeSchema.pre('save', function(next) {
  // Calculate validTo if not set
  if (!this.validTo && this.validFrom && this.validityPeriod) {
    const validToDate = new Date(this.validFrom);
    validToDate.setMonth(validToDate.getMonth() + this.validityPeriod);
    this.validTo = validToDate;
    
    // Set renewal due date (90 days before expiry)
    if (this.renewalRequired) {
      const renewalDue = new Date(validToDate);
      renewalDue.setDate(renewalDue.getDate() - 90);
      this.renewalDueDate = renewalDue;
    }
  }
  
  // Check if expired
  if (this.validTo && new Date() > this.validTo && !this.isExpired && this.status === 'active') {
    this.isExpired = true;
    this.expiredAt = new Date();
    this.status = 'expired';
  }
  
  next();
});

export default mongoose.model('DoctorPrivilege', doctorPrivilegeSchema);

