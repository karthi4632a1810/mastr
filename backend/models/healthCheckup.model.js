import mongoose from 'mongoose';

const healthCheckupSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  checkupDate: {
    type: Date,
    required: true
  },
  checkupType: {
    type: String,
    enum: ['pre_employment', 'annual', 'periodic', 'post_illness', 'return_to_work', 'special'],
    default: 'annual'
  },
  // Health checkup report
  reportFile: {
    type: String,
    default: null
  },
  reportNumber: {
    type: String,
    default: ''
  },
  conductedBy: {
    type: String,
    default: '' // Hospital/clinic name
  },
  doctorName: {
    type: String,
    default: ''
  },
  doctorQualification: {
    type: String,
    default: ''
  },
  // Fitness assessment
  fitnessStatus: {
    type: String,
    enum: ['fit', 'unfit', 'fit_with_restrictions', 'pending'],
    default: 'pending'
  },
  restrictions: [{
    restriction: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    validFrom: {
      type: Date,
      default: Date.now
    },
    validTo: {
      type: Date,
      default: null
    }
  }],
  // Medical findings
  findings: {
    type: String,
    default: ''
  },
  recommendations: {
    type: String,
    default: ''
  },
  // Fitness certificate
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateFile: {
    type: String,
    default: null
  },
  certificateNumber: {
    type: String,
    default: ''
  },
  certificateValidFrom: {
    type: Date,
    default: null
  },
  certificateValidTo: {
    type: Date,
    default: null
  },
  // Next checkup
  nextCheckupDueDate: {
    type: Date,
    default: null
  },
  nextCheckupType: {
    type: String,
    enum: ['annual', 'periodic', 'special'],
    default: 'annual'
  },
  // NABH compliance
  nabhClauses: [{
    type: String
  }],
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
healthCheckupSchema.index({ employee: 1, checkupDate: -1 });
healthCheckupSchema.index({ employee: 1, status: 1 });
healthCheckupSchema.index({ nextCheckupDueDate: 1 });
healthCheckupSchema.index({ fitnessStatus: 1 });

// Pre-save middleware to calculate next checkup date
healthCheckupSchema.pre('save', function(next) {
  if (this.status === 'completed' && this.checkupDate && !this.nextCheckupDueDate) {
    const nextDate = new Date(this.checkupDate);
    
    if (this.checkupType === 'annual' || this.nextCheckupType === 'annual') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      this.nextCheckupDueDate = nextDate;
    } else if (this.checkupType === 'periodic') {
      // Periodic could be 6 months or as per policy
      nextDate.setMonth(nextDate.getMonth() + 6);
      this.nextCheckupDueDate = nextDate;
    }
    
    // Set certificate validity (typically 1 year)
    if (this.certificateIssued && !this.certificateValidTo) {
      this.certificateValidFrom = this.checkupDate;
      const certValidTo = new Date(this.checkupDate);
      certValidTo.setFullYear(certValidTo.getFullYear() + 1);
      this.certificateValidTo = certValidTo;
    }
  }
  
  next();
});

export default mongoose.model('HealthCheckup', healthCheckupSchema);

