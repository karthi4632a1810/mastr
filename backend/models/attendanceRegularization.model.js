import mongoose from 'mongoose';

const attendanceRegularizationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  requestedPunchIn: {
    type: Date,
    default: null
  },
  requestedPunchOut: {
    type: Date,
    default: null
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
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
  rejectionReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('AttendanceRegularization', attendanceRegularizationSchema);
