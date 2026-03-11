import mongoose from 'mongoose';

const incidentReportSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null // null if incident doesn't involve specific employee
  },
  incidentType: {
    type: String,
    enum: [
      'needle_stick',
      'fall',
      'chemical_spill',
      'fire',
      'equipment_failure',
      'patient_safety',
      'workplace_violence',
      'ergonomic',
      'other'
    ],
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
    required: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  // Incident description
  description: {
    type: String,
    required: true
  },
  // Severity classification
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'major', 'critical'],
    required: true
  },
  // People involved
  peopleInvolved: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    role: {
      type: String,
      default: ''
    },
    injury: {
      type: String,
      enum: ['none', 'minor', 'moderate', 'severe'],
      default: 'none'
    },
    treatmentRequired: {
      type: Boolean,
      default: false
    }
  }],
  // Immediate actions taken
  immediateActions: {
    type: String,
    default: ''
  },
  // Reporting
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  // Investigation
  investigation: {
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    },
    investigationCommittee: [{
      member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: {
        type: String,
        default: ''
      }
    }],
    investigationStartDate: {
      type: Date,
      default: null
    },
    investigationEndDate: {
      type: Date,
      default: null
    },
    rootCause: {
      type: String,
      default: ''
    },
    contributingFactors: [{
      type: String
    }],
    investigationReport: {
      type: String,
      default: ''
    },
    investigationReportFile: {
      type: String,
      default: null
    }
  },
  // Corrective & Preventive Actions (CAPA)
  capa: {
    correctiveActions: [{
      action: {
        type: String,
        required: true
      },
      responsible: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      dueDate: {
        type: Date,
        default: null
      },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'overdue'],
        default: 'pending'
      },
      completedDate: {
        type: Date,
        default: null
      },
      evidence: {
        type: String,
        default: ''
      }
    }],
    preventiveActions: [{
      action: {
        type: String,
        required: true
      },
      responsible: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      dueDate: {
        type: Date,
        default: null
      },
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'overdue'],
        default: 'pending'
      },
      completedDate: {
        type: Date,
        default: null
      },
      evidence: {
        type: String,
        default: ''
      }
    }]
  },
  // Management decision
  managementDecision: {
    type: String,
    default: ''
  },
  decidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  decidedAt: {
    type: Date,
    default: null
  },
  // Status
  status: {
    type: String,
    enum: ['reported', 'under_investigation', 'capa_in_progress', 'resolved', 'closed'],
    default: 'reported'
  },
  // Closure
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  closureRemarks: {
    type: String,
    default: ''
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
  // NABH compliance
  nabhClauses: [{
    type: String
  }],
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
incidentReportSchema.index({ employee: 1, incidentDate: -1 });
incidentReportSchema.index({ incidentType: 1, severity: 1 });
incidentReportSchema.index({ status: 1 });
incidentReportSchema.index({ incidentDate: -1 });
incidentReportSchema.index({ department: 1 });
incidentReportSchema.index({ 'investigation.status': 1 });
incidentReportSchema.index({ 'capa.correctiveActions.dueDate': 1 });
incidentReportSchema.index({ 'capa.preventiveActions.dueDate': 1 });

export default mongoose.model('IncidentReport', incidentReportSchema);

