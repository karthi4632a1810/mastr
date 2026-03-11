import mongoose from 'mongoose';

const shiftChangeRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  currentShift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  requestedShift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
  type: { type: String, enum: ['change', 'swap'], default: 'change' },
  swapWithEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  comments: { type: String, default: '' }
}, { timestamps: true });

shiftChangeRequestSchema.index({ employee: 1, date: 1, status: 1 });

export default mongoose.model('ShiftChangeRequest', shiftChangeRequestSchema);

