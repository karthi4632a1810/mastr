import mongoose from 'mongoose';

const cameraSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['usb_webcam', 'laptop_webcam', 'ip_camera', 'lan_webcam', 'http_snapshot', 'stream'],
    required: true
  },
  endpointUrl: {
    type: String,
    required: false, // Made optional - some camera types might not need it
    trim: true,
    default: null
  },
  // Additional connection fields for different camera types
  ipAddress: {
    type: String,
    default: null,
    trim: true
  },
  port: {
    type: Number,
    default: null
  },
  session: {
    type: String,
    default: null,
    trim: true
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  locationTag: {
    type: String,
    default: '',
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isUnderMaintenance: {
    type: Boolean,
    default: false
  },
  // Validation metadata
  lastValidatedAt: {
    type: Date,
    default: null
  },
  lastValidationStatus: {
    type: String,
    enum: ['valid', 'invalid', 'pending'],
    default: 'pending'
  },
  lastValidationError: {
    type: String,
    default: null
  },
  // Configuration
  username: {
    type: String,
    default: null
  },
  password: {
    type: String,
    default: null,
    select: false // Don't include in default queries
  },
  // Metadata
  description: {
    type: String,
    default: ''
  },
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
cameraSchema.index({ isActive: 1, isUnderMaintenance: 1 });
cameraSchema.index({ location: 1 });
cameraSchema.index({ type: 1 });

export default mongoose.model('Camera', cameraSchema);

