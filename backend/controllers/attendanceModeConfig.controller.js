import AttendanceModeConfig from '../models/attendanceModeConfig.model.js';
import AuditLog from '../models/auditLog.model.js';
import Department from '../models/department.model.js';
import Branch from '../models/branch.model.js';

// Get all attendance mode configurations
export const getAttendanceModeConfigs = async (req, res) => {
  try {
    const { scope, isActive } = req.query;
    const filter = {};

    if (scope) filter.scope = scope;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const configs = await AttendanceModeConfig.find(filter)
      .populate('scopeId')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email')
      .sort({ priority: -1, createdAt: -1 });

    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single attendance mode configuration
export const getAttendanceModeConfig = async (req, res) => {
  try {
    const config = await AttendanceModeConfig.findById(req.params.id)
      .populate('scopeId')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');

    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get effective configuration for an employee
export const getEffectiveConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const Employee = (await import('../models/employee.model.js')).default;
    const employee = await Employee.findById(employeeId)
      .populate('department')
      .populate('branch');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const effectiveConfig = await AttendanceModeConfig.getEffectiveConfig(employee);

    res.json({ success: true, data: effectiveConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get current user's effective configuration (for employees)
export const getMyEffectiveConfig = async (req, res) => {
  try {
    const Employee = (await import('../models/employee.model.js')).default;
    const employee = await Employee.findOne({ userId: req.user._id })
      .populate('department', 'name code')
      .populate('branch', 'name code');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const effectiveConfig = await AttendanceModeConfig.getEffectiveConfig(employee);

    res.json({ 
      success: true, 
      data: {
        config: effectiveConfig,
        employee: {
          employeeId: employee.employeeId,
          department: employee.department?.name || 'N/A',
          branch: employee.branch?.name || 'N/A'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching my effective config:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Create attendance mode configuration
export const createAttendanceModeConfig = async (req, res) => {
  try {
    const { scope, scopeId, role, modes, description, priority } = req.body;

    // Validate scope and scopeId
    if (scope === 'department' && !scopeId) {
      return res.status(400).json({ success: false, message: 'Department ID is required for department scope' });
    }
    if (scope === 'location' && !scopeId) {
      return res.status(400).json({ success: false, message: 'Location/Branch ID is required for location scope' });
    }
    if (scope === 'role' && !role) {
      return res.status(400).json({ success: false, message: 'Role is required for role scope' });
    }

    // Validate scopeId exists
    if (scopeId) {
      if (scope === 'department') {
        const department = await Department.findById(scopeId);
        if (!department) {
          return res.status(404).json({ success: false, message: 'Department not found' });
        }
      } else if (scope === 'location') {
        const branch = await Branch.findById(scopeId);
        if (!branch) {
          return res.status(404).json({ success: false, message: 'Branch/Location not found' });
        }
      }
    }

    // Set scopeRef based on scope
    let scopeRef = null;
    if (scope === 'department') scopeRef = 'Department';
    if (scope === 'location') scopeRef = 'Branch';

    // Calculate priority if not provided
    let calculatedPriority = priority;
    if (calculatedPriority === undefined) {
      // Higher priority for more specific scopes
      const priorityMap = {
        'global': 0,
        'role': 1,
        'location': 2,
        'department': 3
      };
      calculatedPriority = priorityMap[scope] || 0;
    }

    // Check for duplicate configuration
    const existingFilter = {
      scope,
      isActive: true
    };
    
    if (scopeId) existingFilter.scopeId = scopeId;
    if (role) existingFilter.role = role;

    const existing = await AttendanceModeConfig.findOne(existingFilter);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A configuration already exists for this scope. Please update the existing one or deactivate it first.'
      });
    }

    const config = await AttendanceModeConfig.create({
      scope,
      scopeId: scopeId || null,
      scopeRef,
      role: role || null,
      modes: modes || {
        faceRecognition: { enabled: false, required: false, threshold: 0.40 },
        geoFence: { enabled: false, required: false },
        hybrid: { enabled: false, mode: 'or' },
        manualOverride: { enabled: true, allowedRoles: ['admin', 'hr'] }
      },
      priority: calculatedPriority,
      description: description || '',
      createdBy: req.user._id
    });

    const populatedConfig = await AttendanceModeConfig.findById(config._id)
      .populate('scopeId')
      .populate('createdBy', 'email');

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE_ATTENDANCE_MODE_CONFIG',
      resource: `attendanceModeConfig:${config._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 201,
      requestBody: { scope, scopeId, role, modes },
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Attendance mode configuration created successfully',
      data: populatedConfig
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update attendance mode configuration
export const updateAttendanceModeConfig = async (req, res) => {
  try {
    const config = await AttendanceModeConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }

    const { modes, description, isActive, priority } = req.body;
    const oldModes = JSON.stringify(config.modes);

    if (modes) {
      // Merge modes (preserve existing values if not provided)
      config.modes = {
        faceRecognition: {
          ...config.modes.faceRecognition,
          ...(modes.faceRecognition || {})
        },
        geoFence: {
          ...config.modes.geoFence,
          ...(modes.geoFence || {})
        },
        hybrid: {
          ...config.modes.hybrid,
          ...(modes.hybrid || {})
        },
        manualOverride: {
          ...config.modes.manualOverride,
          ...(modes.manualOverride || {})
        }
      };
    }

    if (description !== undefined) config.description = description;
    if (isActive !== undefined) config.isActive = isActive;
    if (priority !== undefined) config.priority = priority;
    config.updatedBy = req.user._id;

    await config.save();

    const updatedConfig = await AttendanceModeConfig.findById(config._id)
      .populate('scopeId')
      .populate('updatedBy', 'email');

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE_ATTENDANCE_MODE_CONFIG',
      resource: `attendanceModeConfig:${config._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        oldModes: JSON.parse(oldModes),
        newModes: config.modes,
        changes: { modes, description, isActive, priority }
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Attendance mode configuration updated successfully',
      data: updatedConfig
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete attendance mode configuration
export const deleteAttendanceModeConfig = async (req, res) => {
  try {
    const config = await AttendanceModeConfig.findById(req.params.id);
    if (!config) {
      return res.status(404).json({ success: false, message: 'Configuration not found' });
    }

    // Don't allow deleting global config if it's the only one
    if (config.scope === 'global') {
      const globalConfigs = await AttendanceModeConfig.countDocuments({ scope: 'global', isActive: true });
      if (globalConfigs === 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the only global configuration. Please deactivate it instead.'
        });
      }
    }

    // Audit log before deletion
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE_ATTENDANCE_MODE_CONFIG',
      resource: `attendanceModeConfig:${config._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        scope: config.scope,
        scopeId: config.scopeId,
        role: config.role
      },
      timestamp: new Date()
    });

    await AttendanceModeConfig.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Attendance mode configuration deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function to check if a configuration has any modes enabled
const hasEnabledModes = (modes) => {
  return (
    modes.faceRecognition?.enabled ||
    modes.geoFence?.enabled ||
    modes.hybrid?.enabled
  );
};

// Get configuration summary for dashboard
export const getConfigSummary = async (req, res) => {
  try {
    const configs = await AttendanceModeConfig.find({ isActive: true })
      .populate('scopeId', 'name code')
      .sort({ priority: -1 });

    const summary = {
      global: null,
      byDepartment: [],
      byRole: [],
      byLocation: [],
      total: configs.length,
      configured: 0
    };

    configs.forEach(config => {
      // Only include configurations that have at least one mode enabled
      if (!hasEnabledModes(config.modes)) {
        return; // Skip unset configurations
      }

      const configData = {
        id: config._id,
        scope: config.scope,
        scopeName: config.scopeId?.name || config.role || 'Global',
        modes: config.modes,
        priority: config.priority
      };

      if (config.scope === 'global') {
        summary.global = configData;
        summary.configured++;
      } else if (config.scope === 'department') {
        summary.byDepartment.push(configData);
        summary.configured++;
      } else if (config.scope === 'role') {
        summary.byRole.push(configData);
        summary.configured++;
      } else if (config.scope === 'location') {
        summary.byLocation.push(configData);
        summary.configured++;
      }
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching config summary:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

