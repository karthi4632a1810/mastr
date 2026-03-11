import CameraAssignment from '../models/cameraAssignment.model.js';
import Camera from '../models/camera.model.js';
import Employee from '../models/employee.model.js';
import AuditLog from '../models/auditLog.model.js';

// Get all camera assignments
export const getCameraAssignments = async (req, res) => {
  try {
    const { cameraId, employeeId, isActive, autoPunchInEnabled } = req.query;
    const filter = {};

    // If employee role, only allow querying their own assignments
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }
      // Force filter to only their own employee ID
      filter.employee = employee._id;
    } else {
      // Admin/HR can query any employee
      if (employeeId) filter.employee = employeeId;
    }

    if (cameraId) filter.camera = cameraId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (autoPunchInEnabled !== undefined) filter.autoPunchInEnabled = autoPunchInEnabled === 'true';

    const assignments = await CameraAssignment.find(filter)
      .populate('camera', 'name type endpointUrl isActive location')
      .populate('employee', 'firstName lastName employeeId email department branch')
      .populate('assignedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get assignments for a specific camera
export const getCameraAssignmentsByCamera = async (req, res) => {
  try {
    const { cameraId } = req.params;
    const assignments = await CameraAssignment.find({
      camera: cameraId,
      isActive: true
    })
      .populate('employee', 'firstName lastName employeeId email department branch faceEligible')
      .sort({ priority: 1, createdAt: -1 });

    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get assignments for a specific employee
export const getCameraAssignmentsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const assignments = await CameraAssignment.find({
      employee: employeeId,
      isActive: true
    })
      .populate('camera', 'name type endpointUrl isActive location locationTag')
      .sort({ priority: 1, createdAt: -1 });

    res.json({ success: true, data: assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create camera assignment
export const createCameraAssignment = async (req, res) => {
  try {
    const { cameraId, employeeId, autoPunchInEnabled, priority, notes } = req.body;

    if (!cameraId || !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Camera ID and Employee ID are required'
      });
    }

    // Check if camera exists
    const camera = await Camera.findById(cameraId);
    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Camera not found'
      });
    }

    // Check if employee exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check if assignment already exists
    const existingAssignment = await CameraAssignment.findOne({
      camera: cameraId,
      employee: employeeId
    });

    if (existingAssignment) {
      // Auto-enable face recognition for employee when assignment is reactivated
      if (!employee.faceEligible) {
        employee.faceEligible = true;
        await employee.save();
        console.log(`✅ Auto-enabled faceEligible for employee ${employee.employeeId} (${employee.firstName} ${employee.lastName})`);
      }
      
      // Update existing assignment
      existingAssignment.autoPunchInEnabled = autoPunchInEnabled !== undefined ? autoPunchInEnabled : existingAssignment.autoPunchInEnabled;
      existingAssignment.priority = priority !== undefined ? priority : existingAssignment.priority;
      existingAssignment.notes = notes !== undefined ? notes : existingAssignment.notes;
      existingAssignment.isActive = true;
      existingAssignment.assignedBy = req.user._id;
      await existingAssignment.save();

      const populatedAssignment = await CameraAssignment.findById(existingAssignment._id)
        .populate('camera', 'name type endpointUrl isActive location')
        .populate('employee', 'firstName lastName employeeId email department branch')
        .populate('assignedBy', 'email');

      // Audit log
      await AuditLog.create({
        userId: req.user._id,
        userEmail: req.user.email,
        action: 'UPDATE_CAMERA_ASSIGNMENT',
        resource: `cameraAssignment:${existingAssignment._id}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        statusCode: 200,
        requestBody: req.body,
        timestamp: new Date()
      });

      return res.json({
        success: true,
        message: 'Camera assignment updated successfully',
        data: populatedAssignment
      });
    }

    // Auto-enable face recognition for employee when assigned to camera
    // This ensures face recognition works immediately after assignment
    if (!employee.faceEligible) {
      employee.faceEligible = true;
      await employee.save();
      console.log(`✅ Auto-enabled faceEligible for employee ${employee.employeeId} (${employee.firstName} ${employee.lastName})`);
    }

    // Create new assignment
    const assignment = await CameraAssignment.create({
      camera: cameraId,
      employee: employeeId,
      autoPunchInEnabled: autoPunchInEnabled !== undefined ? autoPunchInEnabled : true,
      priority: priority || 1,
      notes: notes || '',
      assignedBy: req.user._id
    });

    const populatedAssignment = await CameraAssignment.findById(assignment._id)
      .populate('camera', 'name type endpointUrl isActive location')
      .populate('employee', 'firstName lastName employeeId email department branch')
      .populate('assignedBy', 'email');

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE_CAMERA_ASSIGNMENT',
      resource: `cameraAssignment:${assignment._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 201,
      requestBody: req.body,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Camera assigned to employee successfully',
      data: populatedAssignment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update camera assignment
export const updateCameraAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { autoPunchInEnabled, priority, notes, isActive } = req.body;

    const assignment = await CameraAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Camera assignment not found'
      });
    }

    if (autoPunchInEnabled !== undefined) assignment.autoPunchInEnabled = autoPunchInEnabled;
    if (priority !== undefined) assignment.priority = priority;
    if (notes !== undefined) assignment.notes = notes;
    if (isActive !== undefined) assignment.isActive = isActive;

    await assignment.save();

    const populatedAssignment = await CameraAssignment.findById(assignment._id)
      .populate('camera', 'name type endpointUrl isActive location')
      .populate('employee', 'firstName lastName employeeId email department branch')
      .populate('assignedBy', 'email');

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE_CAMERA_ASSIGNMENT',
      resource: `cameraAssignment:${assignment._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: req.body,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Camera assignment updated successfully',
      data: populatedAssignment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete camera assignment
export const deleteCameraAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await CameraAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Camera assignment not found'
      });
    }

    // Audit log before deletion
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE_CAMERA_ASSIGNMENT',
      resource: `cameraAssignment:${assignment._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        cameraId: assignment.camera,
        employeeId: assignment.employee
      },
      timestamp: new Date()
    });

    await CameraAssignment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Camera assignment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk assign cameras to employees
export const bulkAssignCameras = async (req, res) => {
  try {
    const { assignments } = req.body; // Array of { cameraId, employeeId, autoPunchInEnabled, priority }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Assignments array is required'
      });
    }

    const results = {
      succeeded: 0,
      failed: 0,
      errors: []
    };

    for (const assignmentData of assignments) {
      try {
        const { cameraId, employeeId, autoPunchInEnabled, priority } = assignmentData;

        if (!cameraId || !employeeId) {
          results.failed++;
          results.errors.push({
            cameraId,
            employeeId,
            error: 'Camera ID and Employee ID are required'
          });
          continue;
        }

        // Check if assignment already exists
        const existing = await CameraAssignment.findOne({
          camera: cameraId,
          employee: employeeId
        });

        if (existing) {
          existing.autoPunchInEnabled = autoPunchInEnabled !== undefined ? autoPunchInEnabled : existing.autoPunchInEnabled;
          existing.priority = priority !== undefined ? priority : existing.priority;
          existing.isActive = true;
          existing.assignedBy = req.user._id;
          await existing.save();
          results.succeeded++;
        } else {
          await CameraAssignment.create({
            camera: cameraId,
            employee: employeeId,
            autoPunchInEnabled: autoPunchInEnabled !== undefined ? autoPunchInEnabled : true,
            priority: priority || 1,
            assignedBy: req.user._id
          });
          results.succeeded++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          assignment: assignmentData,
          error: error.message
        });
      }
    }

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'BULK_ASSIGN_CAMERAS',
      resource: 'cameraAssignments',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: { total: assignments.length, succeeded: results.succeeded, failed: results.failed },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.succeeded} succeeded, ${results.failed} failed`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

