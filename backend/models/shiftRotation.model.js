import mongoose from 'mongoose';

const patternStepSchema = new mongoose.Schema({
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  days: { type: Number, required: true, min: 1 },
  label: { type: String, default: '' }
}, { _id: false });

const shiftRotationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  cycle: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'weekly' },
  pattern: [patternStepSchema],
  isActive: { type: Boolean, default: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

shiftRotationSchema.index({ code: 1 }, { unique: true });
shiftRotationSchema.index({ name: 1 }, { unique: true });

export default mongoose.model('ShiftRotation', shiftRotationSchema);

