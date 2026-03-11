import mongoose from 'mongoose';

const geoFenceViolationSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  geoFence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeoFence',
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
  location: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    address: String
  },
  distance: {
    type: Number,
    required: true // Distance in meters from geo-fence center
  },
  ipAddress: String,
  device: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_approved'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  comments: String,
  isAnomaly: {
    type: Boolean,
    default: false
  },
  anomalyReason: String
}, {
  timestamps: true
});

geoFenceViolationSchema.index({ employee: 1, createdAt: -1 });
geoFenceViolationSchema.index({ geoFence: 1, createdAt: -1 });
geoFenceViolationSchema.index({ status: 1 });
geoFenceViolationSchema.index({ isAnomaly: 1 });

export default mongoose.model('GeoFenceViolation', geoFenceViolationSchema);

