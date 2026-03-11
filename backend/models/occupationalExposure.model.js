import mongoose from 'mongoose';

const occupationalExposureSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  exposureType: {
    type: String,
    enum: ['needle_stick', 'blood_fluid', 'chemical', 'radiation', 'biological', 'other'],
    required: true
  },
  incidentDate: {
    type: Date,
    required: true
  },
  incidentTime: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  // Incident details
  incidentDescription: {
    type: String,
    required: true
  },
  cause: {
    type: String,
    default: ''
  },
  // Source patient (if applicable)
  sourcePatient: {
    hasSource: {
      type: Boolean,
      default: false
    },
    patientId: {
      type: String,
      default: ''
    },
    knownHivStatus: {
      type: String,
      enum: ['positive', 'negative', 'unknown', 'not_applicable'],
      default: 'unknown'
    },
    knownHepatitisStatus: {
      type: String,
      enum: ['positive', 'negative', 'unknown', 'not_applicable'],
      default: 'unknown'
    }
  },
  // Immediate action taken
  immediateAction: {
    type: String,
    default: ''
  },
  woundCleaned: {
    type: Boolean,
    default: false
  },
  eyewashUsed: {
    type: Boolean,
    default: false
  },
  // Post-Exposure Prophylaxis (PEP)
  pep: {
    recommended: {
      type: Boolean,
      default: false
    },
    provided: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    medication: {
      type: String,
      default: ''
    },
    prescribedBy: {
      type: String,
      default: ''
    },
    completionStatus: {
      type: String,
      enum: ['completed', 'ongoing', 'not_started', 'discontinued'],
      default: 'not_started'
    }
  },
  // Baseline testing
  baselineTesting: {
    hivTestDate: {
      type: Date,
      default: null
    },
    hivTestResult: {
      type: String,
      enum: ['positive', 'negative', 'pending', 'not_done'],
      default: 'not_done'
    },
    hbvTestDate: {
      type: Date,
      default: null
    },
    hbvTestResult: {
      type: String,
      enum: ['positive', 'negative', 'pending', 'not_done'],
      default: 'not_done'
    },
    hcvTestDate: {
      type: Date,
      default: null
    },
    hcvTestResult: {
      type: String,
      enum: ['positive', 'negative', 'pending', 'not_done'],
      default: 'not_done'
    }
  },
  // Follow-up testing
  followUpTests: [{
    testType: {
      type: String,
      enum: ['hiv', 'hbv', 'hcv', 'other'],
      required: true
    },
    testDate: {
      type: Date,
      required: true
    },
    testResult: {
      type: String,
      enum: ['positive', 'negative', 'pending'],
      default: 'pending'
    },
    nextDueDate: {
      type: Date,
      default: null
    },
    remarks: {
      type: String,
      default: ''
    }
  }],
  // Investigation
  investigation: {
    conducted: {
      type: Boolean,
      default: false
    },
    investigatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    investigationDate: {
      type: Date,
      default: null
    },
    rootCause: {
      type: String,
      default: ''
    },
    contributingFactors: [{
      type: String
    }]
  },
  // Outcome
  outcome: {
    type: String,
    enum: ['no_infection', 'under_monitoring', 'positive', 'resolved', 'pending'],
    default: 'pending'
  },
  finalStatus: {
    type: String,
    enum: ['resolved', 'ongoing', 'closed', 'pending'],
    default: 'pending'
  },
  closureDate: {
    type: Date,
    default: null
  },
  closureRemarks: {
    type: String,
    default: ''
  },
  // NABH compliance
  nabhClauses: [{
    type: String
  }],
  // Status
  status: {
    type: String,
    enum: ['reported', 'under_investigation', 'under_treatment', 'monitoring', 'resolved', 'closed'],
    default: 'reported'
  },
  // Documents
  documents: [{
    name: String,
    file: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Audit
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
occupationalExposureSchema.index({ employee: 1, incidentDate: -1 });
occupationalExposureSchema.index({ exposureType: 1, status: 1 });
occupationalExposureSchema.index({ incidentDate: -1 });
occupationalExposureSchema.index({ status: 1 });
occupationalExposureSchema.index({ 'followUpTests.nextDueDate': 1 });

export default mongoose.model('OccupationalExposure', occupationalExposureSchema);

