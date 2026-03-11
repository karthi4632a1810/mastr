import mongoose from 'mongoose';

const autoPunchInConfigSchema = new mongoose.Schema({
  isEnabled: {
    type: Boolean,
    default: false
  },
  // Face matching threshold (0-1, higher = stricter)
  faceMatchThreshold: {
    type: Number,
    default: 0.6,
    min: 0,
    max: 1
  },
  // Cooldown window in minutes (prevents duplicate punches)
  cooldownWindowMinutes: {
    type: Number,
    default: 10,
    min: 1,
    max: 60
  },
  // Camera configuration
  cameras: [{
    cameraId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Camera',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    priority: {
      type: Number,
      default: 1 // Lower number = higher priority
    }
  }],
  // Scope: global, department, role, location
  scope: {
    type: String,
    enum: ['global', 'department', 'role', 'location'],
    default: 'global'
  },
  scopeValue: {
    type: mongoose.Schema.Types.ObjectId,
    default: null // Department/Role/Location ID if scope is not global
  },
  // Notification settings
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    showAlert: {
      type: Boolean,
      default: true
    },
    audibleAlert: {
      type: Boolean,
      default: false
    }
  },
  // Admin rules
  allowRetryOnFailure: {
    type: Boolean,
    default: true // Allow subsequent matches if first auto punch was invalid
  },
  requireGeoValidation: {
    type: Boolean,
    default: false // Require geo-fence validation in addition to face match
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
autoPunchInConfigSchema.index({ scope: 1, scopeValue: 1 });
autoPunchInConfigSchema.index({ isEnabled: 1 });

export default mongoose.model('AutoPunchInConfig', autoPunchInConfigSchema);

