import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['asset_return', 'access_revocation', 'knowledge_transfer', 'attendance_approval', 'finance_clearance', 'id_card_return', 'it_deactivation', 'other'],
    required: true
  },
  responsibleDepartment: {
    type: String,
    enum: ['hr', 'it', 'admin', 'finance', 'manager', 'employee'],
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'not_applicable'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  comments: {
    type: String,
    default: ''
  },
  isMandatory: {
    type: Boolean,
    default: true
  },
  dueDate: {
    type: Date,
    default: null
  }
}, { _id: true });

const exitChecklistSchema = new mongoose.Schema({
  resignation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resignation',
    required: true,
    unique: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  items: [checklistItemSchema],
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  completedAt: {
    type: Date,
    default: null
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes
// resignation already has unique: true in schema definition above
exitChecklistSchema.index({ employee: 1 });
exitChecklistSchema.index({ status: 1 });

// Calculate completion percentage
exitChecklistSchema.virtual('completionPercentage').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  const completed = this.items.filter(item => item.status === 'completed' || item.status === 'not_applicable').length;
  return Math.round((completed / this.items.length) * 100);
});

exitChecklistSchema.set('toJSON', { virtuals: true });

export default mongoose.model('ExitChecklist', exitChecklistSchema);

