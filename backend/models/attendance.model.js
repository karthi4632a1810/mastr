import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  punches: [{
    type: {
      type: String,
      enum: ['punch_in', 'punch_out'],
      required: true
    },
    time: {
      type: Date,
      required: true
    },
    method: {
      type: String,
      enum: ['face_auto', 'face_manual', 'geo', 'otp', 'hr_override', 'manual', 'kiosk'],
      default: 'manual'
    },
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    ipAddress: String,
    device: String,
    camera: {
      cameraId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Camera'
      },
      cameraName: String,
      cameraType: String,
      snapshotUrl: String // URL or base64 data URL of captured image
    },
    faceMatch: {
      matched: Boolean,
      confidence: Number,
      matchScore: Number, // Normalized score (0-1, higher is better)
      source: String, // 'profile_picture' or 'camera'
      threshold: Number // Threshold used for matching
    },
    imageHash: String, // Hash of the captured image for deduplication
    approvalMetadata: {
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approvedAt: Date,
      reason: String,
      overrideType: String // 'hr_override', 'admin_override', etc.
    }
  }],
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'holiday', 'weekend', 'weekoff', 'leave'],
    default: 'absent'
  },
  workingHours: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  isLate: {
    type: Boolean,
    default: false
  },
  isEarlyLeave: {
    type: Boolean,
    default: false
  },
  regularizationRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceRegularization',
    default: null
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
