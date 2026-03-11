import mongoose from 'mongoose';

const competencyAssessmentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  competencyMatrix: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompetencyMatrix',
    required: true
  },
  competencyName: {
    type: String,
    required: true
  },
  assessmentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Assessment method used
  assessmentMethod: {
    type: String,
    enum: ['written_test', 'practical', 'observation', 'simulation', 'peer_review', 'combined'],
    required: true
  },
  // Assessor details
  assessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assessorName: {
    type: String,
    default: ''
  },
  assessorDesignation: {
    type: String,
    default: ''
  },
  // Assessment results
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
  levelAchieved: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: null
  },
  requiredLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    required: true
  },
  status: {
    type: String,
    enum: ['competent', 'not_competent', 'needs_training', 'pending'],
    default: 'pending'
  },
  // Assessment details
  assessmentDetails: {
    writtenTestScore: {
      type: Number,
      default: null
    },
    practicalScore: {
      type: Number,
      default: null
    },
    observationScore: {
      type: Number,
      default: null
    },
    overallRemarks: {
      type: String,
      default: ''
    },
    strengths: [{
      type: String
    }],
    areasForImprovement: [{
      type: String
    }]
  },
  // Validity & Renewal
  validFrom: {
    type: Date,
    default: Date.now
  },
  validTo: {
    type: Date,
    default: null
  },
  renewalPeriod: {
    type: Number, // in months
    default: null
  },
  renewalDueDate: {
    type: Date,
    default: null
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  // Training recommendations
  trainingRequired: {
    type: Boolean,
    default: false
  },
  recommendedTrainingPrograms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingProgram'
  }],
  // Evidence
  evidenceDocuments: [{
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
competencyAssessmentSchema.index({ employee: 1, competencyMatrix: 1, competencyName: 1 });
competencyAssessmentSchema.index({ employee: 1, status: 1 });
competencyAssessmentSchema.index({ assessmentDate: -1 });
competencyAssessmentSchema.index({ validTo: 1, isExpired: 1 });
competencyAssessmentSchema.index({ renewalDueDate: 1 });

// Pre-save middleware to calculate status and validity
competencyAssessmentSchema.pre('save', function(next) {
  // Determine status based on level achieved vs required
  if (this.levelAchieved && this.requiredLevel) {
    const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
    const achievedIndex = levels.indexOf(this.levelAchieved);
    const requiredIndex = levels.indexOf(this.requiredLevel);
    
    if (achievedIndex >= requiredIndex) {
      this.status = 'competent';
    } else {
      this.status = 'not_competent';
      this.trainingRequired = true;
    }
  }
  
  // Calculate validity if renewal period exists
  if (this.renewalPeriod && !this.validTo) {
    const validToDate = new Date(this.validFrom || this.assessmentDate);
    validToDate.setMonth(validToDate.getMonth() + this.renewalPeriod);
    this.validTo = validToDate;
    
    // Set renewal due date (30 days before expiry)
    const renewalDue = new Date(validToDate);
    renewalDue.setDate(renewalDue.getDate() - 30);
    this.renewalDueDate = renewalDue;
  }
  
  // Check if expired
  if (this.validTo && new Date() > this.validTo && !this.isExpired) {
    this.isExpired = true;
    this.status = 'needs_training';
  }
  
  next();
});

export default mongoose.model('CompetencyAssessment', competencyAssessmentSchema);

