import GeoFence from '../models/geoFence.model.js';
import GeoFenceViolation from '../models/geoFenceViolation.model.js';
import Employee from '../models/employee.model.js';
import Department from '../models/department.model.js';
import AuditLog from '../models/auditLog.model.js';

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Check if coordinates are within fence
const isWithinFence = (fence, lat, lng) => {
  const distance = calculateDistance(fence.location.latitude, fence.location.longitude, lat, lng);
  return distance <= fence.radius;
};

// Get all geo-fences
export const getGeoFences = async (req, res) => {
  try {
    const { type, isActive } = req.query;
    const query = {};

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const fences = await GeoFence.find(query)
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email')
      .populate('enforcement.departments', 'name code')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: fences
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single geo-fence
export const getGeoFence = async (req, res) => {
  try {
    const fence = await GeoFence.findById(req.params.id)
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email')
      .populate('enforcement.departments', 'name code');

    if (!fence) {
      return res.status(404).json({ success: false, message: 'Geo-fence not found' });
    }

    res.json({ success: true, data: fence });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get applicable geo-fences for current employee
export const getMyGeoFences = async (req, res) => {
  try {
    // Get current user's employee profile
    const employee = await Employee.findOne({ userId: req.user._id })
      .populate('department');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Get active geo-fences
    const { isActive } = req.query;
    const query = { isActive: isActive !== undefined ? isActive === 'true' : true };

    const allFences = await GeoFence.find(query)
      .populate('enforcement.departments', 'name code')
      .sort({ createdAt: -1 });

    // Filter fences that apply to this employee
    const applicableFences = allFences.filter(fence => {
      // Skip if enforcement is disabled
      if (!fence.enforcement?.enabled) return false;

      // Check if fence applies to this employee
      if (fence.enforcement.applyTo === 'all') {
        return true;
      } else if (fence.enforcement.applyTo === 'departments') {
        if (!fence.enforcement.departments || fence.enforcement.departments.length === 0) {
          return false;
        }
        return fence.enforcement.departments.some(
          dept => dept._id.toString() === employee.department?._id?.toString()
        );
      } else if (fence.enforcement.applyTo === 'roles') {
        return fence.enforcement.roles && fence.enforcement.roles.includes(req.user.role);
      }

      return false;
    });

    res.json({
      success: true,
      data: applicableFences
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create geo-fence
export const createGeoFence = async (req, res) => {
  try {
    const {
      name,
      type,
      location,
      radius,
      deviceRestriction,
      enforcement,
      overrideRules
    } = req.body;

    if (!name || !type || !location || !location.latitude || !location.longitude || !radius) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, location (latitude, longitude), and radius are required'
      });
    }

    const fence = await GeoFence.create({
      name,
      type,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || ''
      },
      radius,
      deviceRestriction: deviceRestriction || 'any_device',
      enforcement: enforcement || { enabled: true, applyTo: 'all' },
      overrideRules: overrideRules || {
        allowOutsidePunch: false,
        requireHRApproval: true
      },
      createdBy: req.user._id
    });

    const populatedFence = await GeoFence.findById(fence._id)
      .populate('createdBy', 'email')
      .populate('enforcement.departments', 'name code');

    // Log creation
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE_GEOFENCE',
      resource: `geofence:${fence._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 201,
      requestBody: { name, type, location, radius },
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Geo-fence created successfully',
      data: populatedFence
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update geo-fence
export const updateGeoFence = async (req, res) => {
  try {
    const fence = await GeoFence.findById(req.params.id);

    if (!fence) {
      return res.status(404).json({ success: false, message: 'Geo-fence not found' });
    }

    const oldData = {
      location: { ...fence.location },
      radius: fence.radius,
      enforcement: { ...fence.enforcement },
      overrideRules: { ...fence.overrideRules }
    };

    // Track changes for version history
    const changes = {};
    if (req.body.location && (
      req.body.location.latitude !== fence.location.latitude ||
      req.body.location.longitude !== fence.location.longitude
    )) {
      changes.location = {
        old: fence.location,
        new: req.body.location
      };
    }
    if (req.body.radius && req.body.radius !== fence.radius) {
      changes.radius = {
        old: fence.radius,
        new: req.body.radius
      };
    }

    Object.assign(fence, req.body);
    if (req.body.location) {
      fence.location = {
        latitude: req.body.location.latitude,
        longitude: req.body.location.longitude,
        address: req.body.location.address || fence.location.address
      };
    }

    // Increment version if significant changes
    if (Object.keys(changes).length > 0) {
      fence.version += 1;
      fence.versionHistory.push({
        version: fence.version,
        changes,
        changedBy: req.user._id,
        changedAt: new Date()
      });
    }

    fence.updatedBy = req.user._id;
    await fence.save();

    const populatedFence = await GeoFence.findById(fence._id)
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email')
      .populate('enforcement.departments', 'name code');

    // Log update
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE_GEOFENCE',
      resource: `geofence:${fence._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: { changes, oldData, newData: req.body },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Geo-fence updated successfully',
      data: populatedFence
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete geo-fence
export const deleteGeoFence = async (req, res) => {
  try {
    const fence = await GeoFence.findById(req.params.id);

    if (!fence) {
      return res.status(404).json({ success: false, message: 'Geo-fence not found' });
    }

    // Log deletion
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE_GEOFENCE',
      resource: `geofence:${fence._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: { name: fence.name, type: fence.type },
      timestamp: new Date()
    });

    await GeoFence.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Geo-fence deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Validate punch location against geo-fences
export const validatePunchLocation = async (employeeId, lat, lng, punchType, ipAddress, device) => {
  try {
    const employee = await Employee.findById(employeeId)
      .populate('department');

    if (!employee) {
      return { valid: false, message: 'Employee not found' };
    }

    // Get active geo-fences
    const activeFences = await GeoFence.find({ isActive: true });

    if (activeFences.length === 0) {
      return { valid: true, message: 'No geo-fences configured' };
    }

    // Check each fence
    for (const fence of activeFences) {
      // Check if enforcement applies to this employee
      if (!fence.enforcement.enabled) continue;

      let appliesToEmployee = false;

      if (fence.enforcement.applyTo === 'all') {
        appliesToEmployee = true;
      } else if (fence.enforcement.applyTo === 'departments') {
        if (fence.enforcement.departments.length === 0) continue;
        appliesToEmployee = fence.enforcement.departments.some(
          deptId => deptId.toString() === employee.department._id.toString()
        );
      } else if (fence.enforcement.applyTo === 'roles') {
        const User = (await import('../models/user.model.js')).default;
        const user = await User.findById(employee.userId);
        if (user && fence.enforcement.roles.includes(user.role)) {
          appliesToEmployee = true;
        }
      }

      if (!appliesToEmployee) continue;

      // Check if within fence
      const distance = calculateDistance(
        fence.location.latitude,
        fence.location.longitude,
        lat,
        lng
      );
      const withinFence = distance <= fence.radius;

      if (!withinFence) {
        // Outside fence - check override rules
        if (fence.overrideRules.allowOutsidePunch) {
          if (fence.overrideRules.requireHRApproval) {
            return {
              valid: true,
              requiresApproval: true,
              fence: fence._id,
              distance: Math.round(distance),
              message: 'Punch outside geo-fence requires HR approval'
            };
          } else {
            return {
              valid: true,
              autoApproved: true,
              fence: fence._id,
              distance: Math.round(distance),
              message: 'Punch outside geo-fence (auto-approved)'
            };
          }
        } else {
          return {
            valid: false,
            fence: fence._id,
            distance: Math.round(distance),
            message: `Punch outside geo-fence. Distance: ${Math.round(distance)}m from ${fence.name}`
          };
        }
      } else {
        // Within fence
        return {
          valid: true,
          withinFence: true,
          fence: fence._id,
          distance: Math.round(distance),
          message: 'Punch within geo-fence'
        };
      }
    }

    // No applicable fences found
    return { valid: true, message: 'No applicable geo-fences' };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};

// Get violations
export const getViolations = async (req, res) => {
  try {
    const { startDate, endDate, status, employeeId, geoFenceId, isAnomaly } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (status) query.status = status;
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) query.employee = employee._id;
    }
    if (geoFenceId) query.geoFence = geoFenceId;
    if (isAnomaly !== undefined) query.isAnomaly = isAnomaly === 'true';

    const violations = await GeoFenceViolation.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .populate('geoFence', 'name type')
      .populate('approvedBy', 'email')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: violations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve/reject violation
export const reviewViolation = async (req, res) => {
  try {
    const { status, comments } = req.body;
    const violation = await GeoFenceViolation.findById(req.params.id);

    if (!violation) {
      return res.status(404).json({ success: false, message: 'Violation not found' });
    }

    if (violation.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Violation already reviewed' });
    }

    violation.status = status;
    violation.approvedBy = req.user._id;
    violation.approvedAt = new Date();
    violation.comments = comments || violation.comments;

    await violation.save();

    // Log review
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'REVIEW_GEOFENCE_VIOLATION',
      resource: `violation:${violation._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: { status, comments },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Violation ${status} successfully`,
      data: violation
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get geo-fence reports
export const getGeoFenceReports = async (req, res) => {
  try {
    const { startDate, endDate, geoFenceId } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (geoFenceId) query.geoFence = geoFenceId;

    const violations = await GeoFenceViolation.find(query)
      .populate('employee', 'firstName lastName employeeId')
      .populate('geoFence', 'name type');

    // Get all punches within date range
    const Attendance = (await import('../models/attendance.model.js')).default;
    const attendanceQuery = {};
    if (startDate || endDate) {
      attendanceQuery.date = {};
      if (startDate) attendanceQuery.date.$gte = new Date(startDate);
      if (endDate) attendanceQuery.date.$lte = new Date(endDate);
    }

    const attendances = await Attendance.find(attendanceQuery)
      .populate('employee', 'firstName lastName employeeId');

    let insidePunches = 0;
    let outsidePunches = 0;
    const distanceDeviations = [];
    const deviceAnomalies = [];

    // Analyze punches
    for (const attendance of attendances) {
      for (const punch of attendance.punches || []) {
        if (punch.location && punch.location.latitude && punch.location.longitude) {
          const fences = await GeoFence.find({ isActive: true });
          let foundInFence = false;

          for (const fence of fences) {
            const distance = calculateDistance(
              fence.location.latitude,
              fence.location.longitude,
              punch.location.latitude,
              punch.location.longitude
            );

            if (distance <= fence.radius) {
              insidePunches++;
              foundInFence = true;
              break;
            } else {
              distanceDeviations.push({
                employee: attendance.employee,
                punch: punch.type,
                time: punch.time,
                distance: Math.round(distance),
                fence: fence.name
              });
            }
          }

          if (!foundInFence) {
            outsidePunches++;
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        summary: {
          insidePunches,
          outsidePunches,
          totalViolations: violations.length,
          pendingApprovals: violations.filter(v => v.status === 'pending').length
        },
        distanceDeviations: distanceDeviations.slice(0, 50),
        violations: violations.slice(0, 50),
        deviceAnomalies: deviceAnomalies
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

