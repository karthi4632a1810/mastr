import mongoose from 'mongoose';

const attendanceModeConfigSchema = new mongoose.Schema({
  // Global or specific scope
  scope: {
    type: String,
    enum: ['global', 'department', 'role', 'location'],
    required: true,
    default: 'global'
  },
  
  // Reference to specific scope (null for global)
  scopeId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    refPath: 'scopeRef'
  },
  
  // Dynamic reference based on scope
  scopeRef: {
    type: String,
    enum: ['Department', 'Branch', null],
    default: null
  },
  
  // Role (for role-based scope)
  role: {
    type: String,
    enum: ['admin', 'hr', 'employee', null],
    default: null
  },
  
  // Attendance modes configuration
  modes: {
    faceRecognition: {
      enabled: {
        type: Boolean,
        default: false
      },
      required: {
        type: Boolean,
        default: false // If true, face recognition is mandatory
      },
      threshold: {
        type: Number,
        default: 0.40, // Face match threshold for ArcFace (0-1, higher = stricter). Recommended: 0.40 for ArcFace embeddings
        min: 0,
        max: 1
      }
    },
    geoFence: {
      enabled: {
        type: Boolean,
        default: false
      },
      required: {
        type: Boolean,
        default: false // If true, geo fence is mandatory
      }
    },
    hybrid: {
      enabled: {
        type: Boolean,
        default: false
      },
      mode: {
        type: String,
        enum: ['or', 'and'], // 'or' = Face OR Geo, 'and' = Face AND Geo (strict)
        default: 'or'
      }
    },
    manualOverride: {
      enabled: {
        type: Boolean,
        default: true // Manual override usually enabled by default
      },
      allowedRoles: [{
        type: String,
        enum: ['admin', 'hr']
      }]
    }
  },
  
  // Priority (lower number = higher priority)
  // More specific scopes should have higher priority
  priority: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
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
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
attendanceModeConfigSchema.index({ scope: 1, scopeId: 1, role: 1, isActive: 1 });
attendanceModeConfigSchema.index({ priority: -1 });
attendanceModeConfigSchema.index({ scope: 1, isActive: 1 });

// Method to determine effective attendance mode for an employee
attendanceModeConfigSchema.statics.getEffectiveConfig = async function(employee) {
  // Priority order: department > role > location > global
  const configs = await this.find({ isActive: true })
    .sort({ priority: -1 })
    .populate('scopeId');
  
  // Find matching configs
  const matches = [];
  
  for (const config of configs) {
    let matchesConfig = false;
    
    if (config.scope === 'global') {
      matchesConfig = true;
    } else if (config.scope === 'department' && employee.department) {
      matchesConfig = config.scopeId && config.scopeId.toString() === employee.department.toString();
    } else if (config.scope === 'role' && employee.userId) {
      // Need to populate user to check role
      const User = mongoose.model('User');
      const user = await User.findById(employee.userId);
      matchesConfig = user && config.role === user.role;
    } else if (config.scope === 'location' && employee.branch) {
      matchesConfig = config.scopeId && config.scopeId.toString() === employee.branch.toString();
    }
    
    if (matchesConfig) {
      matches.push(config);
    }
  }
  
  // Merge configs (more specific overrides less specific)
  const effectiveConfig = {
    faceRecognition: { enabled: false, required: false, threshold: 0.40 },
    geoFence: { enabled: false, required: false },
    hybrid: { enabled: false, mode: 'or' },
    manualOverride: { enabled: true, allowedRoles: ['admin', 'hr'] }
  };
  
  // Apply configs in priority order (lower priority first, so higher priority overrides)
  matches.reverse().forEach(config => {
    if (config.modes.faceRecognition.enabled !== undefined) {
      effectiveConfig.faceRecognition.enabled = config.modes.faceRecognition.enabled;
    }
    if (config.modes.faceRecognition.required !== undefined) {
      effectiveConfig.faceRecognition.required = config.modes.faceRecognition.required;
    }
    if (config.modes.faceRecognition.threshold !== undefined) {
      effectiveConfig.faceRecognition.threshold = config.modes.faceRecognition.threshold;
    }
    if (config.modes.geoFence.enabled !== undefined) {
      effectiveConfig.geoFence.enabled = config.modes.geoFence.enabled;
    }
    if (config.modes.geoFence.required !== undefined) {
      effectiveConfig.geoFence.required = config.modes.geoFence.required;
    }
    if (config.modes.hybrid.enabled !== undefined) {
      effectiveConfig.hybrid.enabled = config.modes.hybrid.enabled;
    }
    if (config.modes.hybrid.mode) {
      effectiveConfig.hybrid.mode = config.modes.hybrid.mode;
    }
    if (config.modes.manualOverride.enabled !== undefined) {
      effectiveConfig.manualOverride.enabled = config.modes.manualOverride.enabled;
    }
    if (config.modes.manualOverride.allowedRoles) {
      effectiveConfig.manualOverride.allowedRoles = config.modes.manualOverride.allowedRoles;
    }
  });
  
  return effectiveConfig;
};

export default mongoose.model('AttendanceModeConfig', attendanceModeConfigSchema);

