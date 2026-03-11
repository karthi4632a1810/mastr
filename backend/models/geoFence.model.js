import mongoose from 'mongoose';

const geoFenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['office', 'branch', 'project_site', 'remote_zone'],
    required: true
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
    address: {
      type: String,
      default: ''
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 10, // Minimum 10 meters
    max: 5000 // Maximum 5km
  },
  deviceRestriction: {
    type: String,
    enum: ['mobile_only', 'any_device'],
    default: 'any_device'
  },
  enforcement: {
    enabled: {
      type: Boolean,
      default: true
    },
    applyTo: {
      type: String,
      enum: ['all', 'departments', 'roles'],
      default: 'all'
    },
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    roles: [{
      type: String,
      enum: ['admin', 'hr', 'employee']
    }]
  },
  overrideRules: {
    allowOutsidePunch: {
      type: Boolean,
      default: false
    },
    requireHRApproval: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    version: Number,
    changes: mongoose.Schema.Types.Mixed,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
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

geoFenceSchema.index({ 'location.latitude': 1, 'location.longitude': 1 });
geoFenceSchema.index({ isActive: 1 });
geoFenceSchema.index({ type: 1 });

// Method to calculate distance between two coordinates (Haversine formula)
geoFenceSchema.methods.calculateDistance = function(lat, lng) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = this.location.latitude * Math.PI / 180;
  const φ2 = lat * Math.PI / 180;
  const Δφ = (lat - this.location.latitude) * Math.PI / 180;
  const Δλ = (lng - this.location.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Method to check if coordinates are within fence
geoFenceSchema.methods.isWithinFence = function(lat, lng) {
  const distance = this.calculateDistance(lat, lng);
  return distance <= this.radius;
};

export default mongoose.model('GeoFence', geoFenceSchema);

