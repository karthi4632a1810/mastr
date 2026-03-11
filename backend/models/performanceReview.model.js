import mongoose from 'mongoose';

const performanceReviewSchema = new mongoose.Schema({
  performanceCycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PerformanceCycle',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  selfAssessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SelfAssessment',
    default: null
  },
  managerEvaluation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ManagerEvaluation',
    default: null
  },
  finalRating: {
    numeric: {
      type: Number,
      min: 0,
      max: 5,
      default: null
    },
    grade: {
      type: String,
      enum: ['A', 'B', 'C', 'D', null],
      default: null
    },
    ratingType: {
      type: String,
      enum: ['numeric', 'grade'],
      default: 'numeric'
    }
  },
  hrComments: {
    type: String,
    default: ''
  },
  justification: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'needs_review', 'pending_manager_feedback', 'finalized'],
    default: 'pending'
  },
  finalizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  finalizedAt: {
    type: Date,
    default: null
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  unlockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  unlockedAt: {
    type: Date,
    default: null
  },
  unlockReason: {
    type: String,
    default: ''
  },
  visibleToEmployee: {
    type: Boolean,
    default: false
  },
  visibleAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
performanceReviewSchema.index({ performanceCycle: 1, employee: 1 }, { unique: true });
performanceReviewSchema.index({ performanceCycle: 1, status: 1 });
performanceReviewSchema.index({ employee: 1, status: 1 });
performanceReviewSchema.index({ finalizedAt: -1 });

export default mongoose.model('PerformanceReview', performanceReviewSchema);

