import mongoose from 'mongoose';

const goalRatingSchema = new mongoose.Schema({
  goal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    default: ''
  }
}, { _id: false });

const managerEvaluationSchema = new mongoose.Schema({
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
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  goalRatings: [goalRatingSchema],
  overallComments: {
    type: String,
    default: ''
  },
  strengths: {
    type: String,
    default: ''
  },
  areasForImprovement: {
    type: String,
    default: ''
  },
  developmentRecommendations: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'reopened'],
    default: 'draft'
  },
  weightedScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  submittedAt: {
    type: Date,
    default: null
  },
  reopenedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reopenedAt: {
    type: Date,
    default: null
  },
  reopenReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
managerEvaluationSchema.index({ performanceCycle: 1, employee: 1 }, { unique: true });
managerEvaluationSchema.index({ employee: 1, status: 1 });
managerEvaluationSchema.index({ manager: 1, status: 1 });
managerEvaluationSchema.index({ submittedAt: -1 });

// Pre-save hook to calculate weighted score
managerEvaluationSchema.pre('save', async function(next) {
  if (this.isModified('goalRatings') || this.isModified('status')) {
    if (this.status === 'submitted' && this.goalRatings && this.goalRatings.length > 0) {
      const Goal = mongoose.model('Goal');
      
      // Get all goals with their weightages
      const goalIds = this.goalRatings.map(gr => gr.goal);
      const goals = await Goal.find({ _id: { $in: goalIds } }).select('weightage');
      
      const goalWeightMap = {};
      goals.forEach(g => {
        goalWeightMap[g._id.toString()] = g.weightage;
      });
      
      // Calculate weighted average
      let totalWeight = 0;
      let weightedSum = 0;
      
      this.goalRatings.forEach(goalRating => {
        const goalId = goalRating.goal.toString();
        const weight = goalWeightMap[goalId] || 0;
        weightedSum += goalRating.rating * weight;
        totalWeight += weight;
      });
      
      this.weightedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
  }
  next();
});

export default mongoose.model('ManagerEvaluation', managerEvaluationSchema);

