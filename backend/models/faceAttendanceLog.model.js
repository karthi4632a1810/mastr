import mongoose from 'mongoose';

const faceAttendanceLogSchema = new mongoose.Schema({
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
  punch: {
    type: {
      type: String,
      enum: ['punch_in', 'punch_out'],
      required: true
    },
    time: {
      type: Date,
      required: true
    }
  },
  // Face recognition details
  faceMatch: {
    matched: {
      type: Boolean,
      required: true
    },
    confidence: {
      type: Number,
      default: 0
    },
    matchScore: {
      type: Number,
      default: 0 // 0-1, higher is better
    },
    threshold: {
      type: Number,
      default: 0.6
    },
    source: {
      type: String,
      enum: ['profile_picture', 'camera', 'office_camera'],
      default: 'camera'
    }
  },
  // Image information
  image: {
    snapshotUrl: String, // Base64 data URL or URL
    imageHash: String, // SHA256 hash for deduplication
    thumbnailUrl: String, // Thumbnail for display
    imageSource: {
      type: String,
      enum: ['office_camera', 'employee_device', 'kiosk'],
      default: 'office_camera'
    }
  },
  // Camera information
  camera: {
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Camera'
    },
    cameraName: String,
    cameraType: String,
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    locationTag: String
  },
  // Device and location info
  device: {
    ipAddress: String,
    userAgent: String,
    deviceType: String
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  // Verification status
  verificationStatus: {
    type: String,
    enum: ['success', 'failed', 'fallback_used', 'pending', 'verified', 'suspicious', 'needs_followup'],
    default: 'pending'
  },
  // Method used
  method: {
    type: String,
    enum: ['face_auto', 'face_manual', 'geo', 'otp', 'hr_override', 'manual', 'kiosk'],
    default: 'face_auto'
  },
  // HR/Admin override info
  overrideInfo: {
    applied: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    reason: String,
    overrideType: String
  },
  // HR review actions
  hrReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    status: {
      type: String,
      enum: ['verified', 'suspicious', 'needs_followup'],
      default: null
    },
    notes: String
  },
  // Flags
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  // Metadata
  metadata: {
    processingTime: Number, // milliseconds
    retryCount: Number,
    fallbackMethod: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
faceAttendanceLogSchema.index({ employee: 1, createdAt: -1 });
faceAttendanceLogSchema.index({ attendance: 1 });
faceAttendanceLogSchema.index({ 'punch.time': -1 });
faceAttendanceLogSchema.index({ verificationStatus: 1 });
faceAttendanceLogSchema.index({ 'camera.cameraId': 1 });
faceAttendanceLogSchema.index({ 'faceMatch.matched': 1 });
faceAttendanceLogSchema.index({ createdAt: -1 });

export default mongoose.model('FaceAttendanceLog', faceAttendanceLogSchema);

