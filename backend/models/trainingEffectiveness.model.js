import mongoose from 'mongoose';

const trainingEffectivenessSchema = new mongoose.Schema({
  trainingRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingRecord',
    required: true
  },
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
  // Pre-training assessment
  preTrainingAssessment: {
    conducted: {
      type: Boolean,
      default: false
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    conductedDate: {
      type: Date,
      default: null
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  // Post-training assessment
  postTrainingAssessment: {
    conducted: {
      type: Boolean,
      default: false
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },
    conductedDate: {
      type: Date,
      default: null
    },
    improvement: {
      type: Number, // Percentage improvement
      default: null
    },
    remarks: {
      type: String,
      default: ''
    }
  },
  // On-the-job performance tracking
  performanceTracking: {
    tracked: {
      type: Boolean,
      default: false
    },
    trackingPeriod: {
      startDate: {
        type: Date,
        default: null
      },
      endDate: {
        type: Date,
        default: null
      }
    },
    performanceRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    observations: [{
      date: {
        type: Date,
        default: Date.now
      },
      observer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      observation: {
        type: String,
        default: ''
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      }
    }],
    averageRating: {
      type: Number,
      default: null
    }
  },
  // Effectiveness evaluation
  effectivenessRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  effectivenessStatus: {
    type: String,
    enum: ['effective', 'partially_effective', 'not_effective', 'needs_review', 'pending'],
    default: 'pending'
  },
  // Re-training recommendation
  retrainingRequired: {
    type: Boolean,
    default: false
  },
  retrainingReason: {
    type: String,
    default: ''
  },
  retrainingDueDate: {
    type: Date,
    default: null
  },
  // Feedback
  employeeFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    comments: {
      type: String,
      default: ''
    },
    submittedAt: {
      type: Date,
      default: null
    }
  },
  // NABH compliance
  nabhClauses: [{
    type: String
  }],
  // Status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'needs_review'],
    default: 'pending'
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  evaluatedAt: {
    type: Date,
    default: null
  },
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
trainingEffectivenessSchema.index({ trainingRecord: 1 });
trainingEffectivenessSchema.index({ employee: 1, trainingProgram: 1 });
trainingEffectivenessSchema.index({ effectivenessStatus: 1 });
trainingEffectivenessSchema.index({ retrainingRequired: 1, retrainingDueDate: 1 });

// Pre-save middleware to calculate effectiveness
trainingEffectivenessSchema.pre('save', function(next) {
  // Calculate improvement percentage
  if (this.preTrainingAssessment.score !== null && this.postTrainingAssessment.score !== null) {
    const improvement = ((this.postTrainingAssessment.score - this.preTrainingAssessment.score) / this.preTrainingAssessment.score) * 100;
    this.postTrainingAssessment.improvement = improvement;
  }
  
  // Calculate average performance rating
  if (this.performanceTracking.observations && this.performanceTracking.observations.length > 0) {
    const ratings = this.performanceTracking.observations
      .map(obs => obs.rating)
      .filter(rating => rating !== null && rating !== undefined);
    if (ratings.length > 0) {
      this.performanceTracking.averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    }
  }
  
  // Determine effectiveness status
  if (this.postTrainingAssessment.score !== null && this.performanceTracking.averageRating !== null) {
    if (this.postTrainingAssessment.score >= 80 && this.performanceTracking.averageRating >= 4) {
      this.effectivenessStatus = 'effective';
    } else if (this.postTrainingAssessment.score >= 60 && this.performanceTracking.averageRating >= 3) {
      this.effectivenessStatus = 'partially_effective';
    } else {
      this.effectivenessStatus = 'not_effective';
      this.retrainingRequired = true;
    }
  }
  
  next();
});

export default mongoose.model('TrainingEffectiveness', trainingEffectivenessSchema);

