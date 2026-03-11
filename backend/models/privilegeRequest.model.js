import mongoose from 'mongoose';

const privilegeRequestSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  requestedPrivileges: [{
    privilegeCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrivilegeCategory',
      required: true
    },
    justification: {
      type: String,
      default: ''
    },
    supportingDocuments: [{
      name: String,
      file: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  // Application details
  applicationDate: {
    type: Date,
    default: Date.now
  },
  // Qualification & Experience
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    certificateFile: String
  }],
  experience: {
    totalYears: Number,
    relevantExperience: Number,
    experienceDetails: [{
      organization: String,
      position: String,
      fromDate: Date,
      toDate: Date,
      responsibilities: String
    }]
  },
  // Training & Competencies
  relevantTraining: [{
    trainingProgram: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingProgram'
    },
    completionDate: Date,
    certificateFile: String
  }],
  competencies: [{
    competencyName: String,
    level: String,
    assessmentDate: Date
  }],
  // References
  references: [{
    name: String,
    designation: String,
    organization: String,
    contact: String,
    relationship: String
  }],
  // Review workflow
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'hod_approved', 'committee_review', 'medical_superintendent_approved', 'approved', 'rejected', 'withdrawn'],
    default: 'submitted'
  },
  // Reviewers
  reviewedByHod: {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    comments: String,
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'pending']
    }
  },
  reviewedByCommittee: {
    committee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PrivilegeCommittee'
    },
    meetingDate: Date,
    reviewedAt: Date,
    comments: String,
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'pending', 'requires_more_info']
    },
    recommendations: [{
      privilegeCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PrivilegeCategory'
      },
      recommendation: {
        type: String,
        enum: ['grant', 'grant_with_restrictions', 'deny', 'defer']
      },
      restrictions: String,
      conditions: String
    }]
  },
  reviewedByMedicalSuperintendent: {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    comments: String,
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'pending']
    }
  },
  // Final decision
  finalDecision: {
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'partially_approved'],
      default: null
    },
    approvedPrivileges: [{
      privilegeCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PrivilegeCategory'
      },
      restrictions: String,
      conditions: String
    }],
    rejectedPrivileges: [{
      privilegeCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PrivilegeCategory'
      },
      reason: String
    }],
    decisionDate: Date,
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String
  },
  // Appeal
  appeal: {
    appealed: {
      type: Boolean,
      default: false
    },
    appealDate: Date,
    appealReason: String,
    appealStatus: {
      type: String,
      enum: ['pending', 'under_review', 'approved', 'rejected'],
      default: null
    },
    appealDecision: String,
    appealDecidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appealDecidedAt: Date
  },
  // NABH compliance
  nabhClauses: [{
    type: String
  }],
  // Status
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
privilegeRequestSchema.index({ employee: 1, status: 1 });
privilegeRequestSchema.index({ status: 1 });
privilegeRequestSchema.index({ applicationDate: -1 });
privilegeRequestSchema.index({ 'reviewedByCommittee.committee': 1 });

export default mongoose.model('PrivilegeRequest', privilegeRequestSchema);

