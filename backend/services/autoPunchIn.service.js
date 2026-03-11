import Employee from '../models/employee.model.js';
import Attendance from '../models/attendance.model.js';
import Camera from '../models/camera.model.js';
import CameraAssignment from '../models/cameraAssignment.model.js';
import AutoPunchInConfig from '../models/autoPunchInConfig.model.js';
import AuditLog from '../models/auditLog.model.js';
import { captureSnapshotFromCamera } from './cameraValidation.service.js';
import { compareFaceDescriptors, detectFaces } from './pythonFaceRecognition.service.js';
import crypto from 'crypto';
import moment from 'moment';

// Generate hash from image buffer
function generateImageHash(imageBuffer) {
  return crypto.createHash('sha256').update(imageBuffer).digest('hex');
}

// Convert base64 data URL to buffer
function dataURLToBuffer(dataUrl) {
  const base64Data = dataUrl.split(',')[1];
  return Buffer.from(base64Data, 'base64');
}

// Process image buffer to generate face descriptor using Python service
async function processImageForFaceRecognition(imageBuffer) {
  try {
    const { generateFaceDescriptor } = await import('./pythonFaceRecognition.service.js');
    const result = await generateFaceDescriptor(imageBuffer);
    return result;
  } catch (error) {
    console.error('Error processing image for face recognition:', error);
    return {
      success: false,
      error: error.message || 'Failed to process face recognition'
    };
  }
}

// Get effective auto punch-in configuration for an employee
async function getEffectiveAutoPunchInConfig(employee) {
  // Priority: Department > Location > Role > Global
  const configs = await AutoPunchInConfig.find({ isEnabled: true })
    .populate('cameras.cameraId')
    .sort({ scope: 1 }); // Sort to prioritize more specific scopes

  // Find matching config
  let effectiveConfig = null;

  for (const config of configs) {
    if (config.scope === 'global') {
      effectiveConfig = config;
    } else if (config.scope === 'department' && employee.department?.toString() === config.scopeValue?.toString()) {
      effectiveConfig = config;
      break; // Department is more specific, use it
    } else if (config.scope === 'location' && employee.branch?.toString() === config.scopeValue?.toString()) {
      if (!effectiveConfig || effectiveConfig.scope === 'global') {
        effectiveConfig = config;
      }
    } else if (config.scope === 'role' && employee.designation?.toString() === config.scopeValue?.toString()) {
      if (!effectiveConfig || (effectiveConfig.scope !== 'department' && effectiveConfig.scope !== 'location')) {
        effectiveConfig = config;
      }
    }
  }

  return effectiveConfig;
}

// Check if employee already has a punch-in today (per-day cooldown)
async function hasRecentPunchIn(employeeId, cooldownMinutes) {
  const today = moment().startOf('day').toDate();

  const attendance = await Attendance.findOne({
    employee: employeeId,
    date: today
  });

  if (!attendance || !attendance.punches || attendance.punches.length === 0) {
    return false;
  }

  // Check if there's already a punch-in today (per-day cooldown)
  const todayPunchIn = attendance.punches.find(punch => {
    return punch.type === 'punch_in' &&
           punch.method === 'face_auto' &&
           moment(punch.time).isSameOrAfter(today, 'day');
  });

  return !!todayPunchIn;
}

// Auto punch-in service
export async function processAutoPunchIn(cameraId, imageBuffer, ipAddress, device, location = null) {
  try {
    // Get camera
    const camera = await Camera.findById(cameraId).select('+password');
    if (!camera || !camera.isActive || camera.isUnderMaintenance) {
      return {
        success: false,
        error: 'Camera is not available'
      };
    }

    // Process image for face recognition
    const faceResult = await processImageForFaceRecognition(imageBuffer);
    if (!faceResult.success) {
      return {
        success: false,
        error: faceResult.error || 'Failed to detect face in image'
      };
    }

    const detectedDescriptor = faceResult.descriptor;
    const imageHash = generateImageHash(imageBuffer);

    // Get employees assigned to this camera with auto punch-in enabled
    const assignments = await CameraAssignment.find({
      camera: cameraId,
      isActive: true,
      autoPunchInEnabled: true
    }).populate('employee');

    // Filter to face-eligible employees (with either faceDescriptor or profilePhoto)
    const employees = assignments
      .map(a => a.employee)
      .filter(emp => emp && emp.faceEligible && (emp.faceDescriptor?.length > 0 || emp.profilePhoto));

    // If no assignments, fall back to all face-eligible employees (backward compatibility)
    let allEmployees = employees;
    if (employees.length === 0) {
      allEmployees = await Employee.find({
      faceEligible: true,
        $or: [
          { faceDescriptor: { $exists: true, $ne: null, $not: { $size: 0 } } },
          { profilePhoto: { $exists: true, $ne: null } }
        ]
    }).populate('department branch designation');
    }

    if (allEmployees.length === 0) {
      return {
        success: false,
        error: 'No face-eligible employees assigned to this camera'
      };
    }

    // Generate descriptors for employees that don't have faceDescriptor but have profilePhoto
    const employeeDescriptorMap = new Map();
    const { generateFaceDescriptor } = await import('./pythonFaceRecognition.service.js');
    
    for (const employee of allEmployees) {
      if (employee.faceDescriptor && employee.faceDescriptor.length > 0) {
        // Use existing descriptor
        employeeDescriptorMap.set(employee._id.toString(), employee.faceDescriptor);
      } else if (employee.profilePhoto) {
        // Generate descriptor from profile photo on-the-fly
        try {
          const profileResult = await generateFaceDescriptor(employee.profilePhoto);
          if (profileResult.success && profileResult.descriptor) {
            employeeDescriptorMap.set(employee._id.toString(), profileResult.descriptor);
            // Optionally save to database for future use (async, don't wait)
            Employee.findByIdAndUpdate(employee._id, { 
              faceDescriptor: profileResult.descriptor 
            }).catch(err => console.warn(`Failed to save descriptor for ${employee.employeeId}:`, err.message));
          }
        } catch (err) {
          console.warn(`Failed to generate descriptor for ${employee.employeeId}:`, err.message);
        }
      }
    }

    // Filter to only employees with valid descriptors
    allEmployees = allEmployees.filter(emp => employeeDescriptorMap.has(emp._id.toString()));

    if (allEmployees.length === 0) {
      return {
        success: false,
        error: 'No employees with valid face descriptors found for this camera'
      };
    }

    // Get effective auto punch-in configuration
    // For now, use global config or first available config
    const configs = await AutoPunchInConfig.find({ isEnabled: true })
      .populate('cameras.cameraId')
      .sort({ scope: 1 });

    const effectiveConfig = configs.find(c => 
      c.cameras.some(cam => cam.cameraId?._id?.toString() === cameraId.toString())
    ) || configs[0];

    // Use default values if no config exists (0.60 = 60% for auto punch-in)
    // Higher threshold for auto punch-in to ensure accuracy
    const threshold = effectiveConfig?.faceMatchThreshold || 0.60;
    const cooldownWindowMinutes = effectiveConfig?.cooldownWindowMinutes || 1440; // 24 hours (per-day cooldown)

    // Match face against assigned employees
    let bestMatch = null;
    let bestScore = 0;

    for (const employee of allEmployees) {
      const employeeId = employee._id.toString();
      const employeeDescriptor = employeeDescriptorMap.get(employeeId);
      
      if (!employeeDescriptor || employeeDescriptor.length === 0) {
        continue;
      }

      // Compare descriptors
      const comparison = await compareFaceDescriptors(
        detectedDescriptor,
        employeeDescriptor,
        threshold
      );

      // Use similarity directly (0-1, higher is better)
      // Similarity is already normalized and more accurate than distance conversion
      const score = comparison.similarity;

      if (comparison.match && score >= threshold && score > bestScore) {
        bestScore = score;
        bestMatch = {
          employee,
          distance: comparison.distance,
          score
        };
      }
    }

    if (!bestMatch || bestScore < threshold) {
      // Log failed attempt
      await AuditLog.create({
        userId: null,
        userEmail: 'system',
        action: 'AUTO_PUNCH_IN_FAILED',
        resource: `camera:${cameraId}`,
        ipAddress,
        userAgent: device,
        statusCode: 400,
        requestBody: {
          reason: 'No matching face found or score below threshold',
          threshold,
          bestScore: bestMatch ? bestScore : 0
        },
        timestamp: new Date()
      });

      return {
        success: false,
        error: 'No matching face found or confidence below threshold',
        bestScore: bestMatch ? bestScore : 0,
        threshold
      };
    }

    const employee = bestMatch.employee;

    // Check if employee already punched in today (per-day cooldown)
    const hasRecent = await hasRecentPunchIn(employee._id, cooldownWindowMinutes);
    if (hasRecent) {
      return {
        success: false,
        error: 'Auto punch-in already recorded for today. You can punch in again tomorrow.',
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`
      };
    }

    // Create or update attendance record
    const today = moment().startOf('day').toDate();
    let attendance = await Attendance.findOne({
      employee: employee._id,
      date: today
    });

    const punchData = {
      type: 'punch_in',
      time: new Date(),
      method: 'face_auto',
      location: location || null,
      ipAddress,
      device,
      camera: {
        cameraId: camera._id,
        cameraName: camera.name,
        cameraType: camera.type,
        snapshotUrl: `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
      },
      faceMatch: {
        matched: true,
        confidence: bestScore,
        matchScore: bestScore,
        source: 'camera',
        threshold
      },
      imageHash
    };

    if (!attendance) {
      // Set status to 'present' immediately when punch-in is created
      attendance = await Attendance.create({
        employee: employee._id,
        date: today,
        punches: [punchData],
        shift: employee.shift || null,
        status: 'present', // Mark as present when punch-in happens
        workingHours: 0
      });
    } else {
      // Check if there's already a punch-in today
      const existingPunchIn = attendance.punches.find(p => p.type === 'punch_in');
      if (existingPunchIn) {
        return {
          success: false,
          error: 'Punch-in already recorded for today',
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`
        };
      }

      attendance.punches.push(punchData);
      // Update status to 'present' if it was 'absent'
      if (attendance.status === 'absent') {
        attendance.status = 'present';
      }
      await attendance.save();
    }

    // Calculate attendance metrics to update status and working hours
    const { calculateAttendanceMetrics } = await import('../controllers/attendance.controller.js');
    await calculateAttendanceMetrics(attendance);
    
    // Reload attendance to get updated status
    attendance = await Attendance.findById(attendance._id);

    // Create face attendance log
    const { createFaceAttendanceLog } = await import('./faceAttendanceLog.service.js');
    await createFaceAttendanceLog(attendance, punchData, employee);

    // Log successful auto punch-in
    await AuditLog.create({
      userId: employee.userId,
      userEmail: employee.email || 'unknown',
      action: 'AUTO_PUNCH_IN_SUCCESS',
      resource: `attendance:${attendance._id}`,
      ipAddress,
      userAgent: device,
      statusCode: 200,
      requestBody: {
        employeeId: employee.employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        cameraId: camera._id,
        cameraName: camera.name,
        matchScore: bestScore,
        threshold,
        imageHash
      },
      timestamp: new Date()
    });

    return {
      success: true,
      message: 'Auto punch-in recorded successfully',
      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`
        },
        attendance: {
          id: attendance._id,
          punchTime: punchData.time,
          matchScore: bestScore
        },
        camera: {
          id: camera._id,
          name: camera.name
        }
      }
    };
  } catch (error) {
    console.error('Error in auto punch-in:', error);
    return {
      success: false,
      error: error.message || 'Failed to process auto punch-in'
    };
  }
}

