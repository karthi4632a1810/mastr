import mongoose from 'mongoose';

const shiftGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

shiftGroupSchema.index({ code: 1 }, { unique: true });
shiftGroupSchema.index({ name: 1 }, { unique: true });

export default mongoose.model('ShiftGroup', shiftGroupSchema);

