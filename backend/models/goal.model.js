import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['productivity', 'leadership', 'behavioural', 'technical'],
    required: true
  },
  weightage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  dueDate: {
    type: Date,
    required: true
  },
  successCriteria: {
    type: String,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'reopened'],
    default: 'draft'
  },
  proposedBy: {
    type: String,
    enum: ['employee', 'manager', 'hr'],
    default: 'manager'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  isMandatory: {
    type: Boolean,
    default: false
  },
  isReopened: {
    type: Boolean,
    default: false
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
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes
goalSchema.index({ performanceCycle: 1, employee: 1, title: 1 }, { unique: true });
goalSchema.index({ performanceCycle: 1, employee: 1, status: 1 });
goalSchema.index({ employee: 1, status: 1 });
goalSchema.index({ assignedBy: 1 });
goalSchema.index({ dueDate: 1 });

// Pre-save validation: Check for duplicate goals within the same cycle
goalSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('title')) {
    const existing = await mongoose.model('Goal').findOne({
      _id: { $ne: this._id },
      performanceCycle: this.performanceCycle,
      employee: this.employee,
      title: this.title
    });
    
    if (existing) {
      const error = new Error('Duplicate goal title within the same performance cycle');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  next();
});

export default mongoose.model('Goal', goalSchema);

