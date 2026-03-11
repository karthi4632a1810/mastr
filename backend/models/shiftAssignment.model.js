import mongoose from 'mongoose';

const conflictSchema = new mongoose.Schema({
  type: { type: String, enum: ['duplicate', 'overlap', 'rest', 'inactive_shift'], required: true },
  message: { type: String, required: true }
}, { _id: false });

const shiftAssignmentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['default', 'roster', 'override'],
    default: 'roster'
  },
  recurrence: {
    type: String,
    enum: ['single', 'daily', 'weekly', 'monthly'],
    default: 'single'
  },
  range: {
    startDate: Date,
    endDate: Date
  },
  overrideType: {
    type: String,
    enum: ['leave', 'holiday', 'event', 'on_duty', 'manual', null],
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  conflicts: [conflictSchema],
  rotation: {
    patternId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftRotation', default: null },
    stepIndex: { type: Number, default: 0 },
    cycleName: { type: String, default: null }
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

shiftAssignmentSchema.index({ employee: 1, date: 1 }, { unique: false });

export default mongoose.model('ShiftAssignment', shiftAssignmentSchema);

