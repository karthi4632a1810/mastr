import mongoose from 'mongoose';

const trainingRecordSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  trainingProgram: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingProgram',
    required: true
  },
  trainingDate: {
    type: Date,
    required: true
  },
  completionDate: {
    type: Date,
    default: null
  },
  // Training details
  trainer: {
    name: {
      type: String,
      default: ''
    },
    credentials: {
      type: String,
      default: ''
    },
    organization: {
      type: String,
      default: ''
    }
  },
  location: {
    type: String,
    default: ''
  },
  trainingMethod: {
    type: String,
    enum: ['classroom', 'online', 'hands_on', 'hybrid', 'external'],
    default: 'classroom'
  },
  // Attendance
  attendance: {
    present: {
      type: Boolean,
      default: true
    },
    hoursAttended: {
      type: Number,
      default: 0
    },
    attendancePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    }
  },
  // Assessment
  assessment: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    maxScore: {
      type: Number,
      default: 100
    },
    passingScore: {
      type: Number,
      default: 70
    },
    passed: {
      type: Boolean,
      default: false
    },
    assessmentDate: {
      type: Date,
      default: null
    },
    assessmentMethod: {
      type: String,
      enum: ['written', 'practical', 'oral', 'observation', 'online', 'combined'],
      default: 'written'
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  // Certificate
  certificate: {
    issued: {
      type: Boolean,
      default: false
    },
    certificateNumber: {
      type: String,
      default: null
    },
    certificateFile: {
      type: String,
      default: null
    },
    issuedDate: {
      type: Date,
      default: null
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  // Validity & Renewal
  validFrom: {
    type: Date,
    default: function() {
      return this.trainingDate || new Date();
    }
  },
  validTo: {
    type: Date,
    default: null // Calculated based on training program validity period
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  expiredAt: {
    type: Date,
    default: null
  },
  renewalRequired: {
    type: Boolean,
    default: false
  },
  renewalDueDate: {
    type: Date,
    default: null
  },
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'failed', 'cancelled', 'expired'],
    default: 'scheduled'
  },
  // NABH compliance
  nabhEvidenceTagged: {
    type: Boolean,
    default: false
  },
  nabhClauses: [{
    type: String
  }],
  // Additional details
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
trainingRecordSchema.index({ employee: 1, trainingProgram: 1 });
trainingRecordSchema.index({ employee: 1, status: 1 });
trainingRecordSchema.index({ trainingProgram: 1, status: 1 });
trainingRecordSchema.index({ validTo: 1, isExpired: 1 });
trainingRecordSchema.index({ renewalDueDate: 1, renewalRequired: 1 });
trainingRecordSchema.index({ trainingDate: -1 });

// Pre-save middleware to calculate validity
trainingRecordSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('trainingDate') || this.isModified('trainingProgram')) {
    const TrainingProgram = mongoose.model('TrainingProgram');
    const program = await TrainingProgram.findById(this.trainingProgram);
    
    if (program && program.validityPeriod) {
      const validFrom = this.validFrom || this.trainingDate || new Date();
      const validToDate = new Date(validFrom);
      validToDate.setMonth(validToDate.getMonth() + program.validityPeriod);
      this.validTo = validToDate;
      this.renewalRequired = program.renewalRequired;
      
      // Set renewal due date (30 days before expiry)
      if (program.renewalRequired) {
        const renewalDue = new Date(validToDate);
        renewalDue.setDate(renewalDue.getDate() - 30);
        this.renewalDueDate = renewalDue;
      }
    }
  }
  
  // Check if expired
  if (this.validTo && new Date() > this.validTo && !this.isExpired) {
    this.isExpired = true;
    this.expiredAt = new Date();
    if (this.status === 'completed') {
      this.status = 'expired';
    }
  }
  
  // Calculate assessment passed status
  if (this.assessment.score !== null && this.assessment.passingScore) {
    this.assessment.passed = this.assessment.score >= this.assessment.passingScore;
    if (this.status === 'completed' && !this.assessment.passed) {
      this.status = 'failed';
    }
  }
  
  next();
});

export default mongoose.model('TrainingRecord', trainingRecordSchema);

