import Attendance from '../models/attendance.model.js';
import Employee from '../models/employee.model.js';
import Shift from '../models/shift.model.js';
import GeoFenceViolation from '../models/geoFenceViolation.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import AttendanceRegularization from '../models/attendanceRegularization.model.js';
import Camera from '../models/camera.model.js';
import AuditLog from '../models/auditLog.model.js';
import { validatePunchLocation } from './geoFence.controller.js';
import { captureSnapshotFromCamera } from '../services/cameraValidation.service.js';
import { generateFaceDescriptor, compareFaceDescriptors } from '../services/pythonFaceRecognition.service.js';
import moment from 'moment';
import Department from '../models/department.model.js';
import AttendanceModeConfig from '../models/attendanceModeConfig.model.js';

// Punch In/Out
export const punchInOut = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const today = moment().startOf('day').toDate();
    let attendance = await Attendance.findOne({ employee: employee._id, date: today });

    const punchType = req.body.type || 'punch_in';
    const location = req.body.location || {};
    const cameraId = req.body.cameraId;
    const method = req.body.method || 'manual'; // face_manual, geo, otp, hr_override, manual, kiosk
    const ipAddress = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'];
    
    // For punch-out, validate that punch-in exists
    if (punchType === 'punch_out') {
      const hasPunchIn = attendance?.punches?.some(p => p.type === 'punch_in');
      if (!hasPunchIn) {
        // Check if HR override is allowed
        if (method !== 'hr_override' && req.user.role !== 'hr' && req.user.role !== 'admin') {
          return res.status(400).json({
            success: false,
            message: 'Punch-in is required before punch-out. Please contact HR if this is an error.'
          });
        }
      }
    }
    
    // Handle camera snapshot if camera ID is provided
    let cameraSnapshot = null;
    let cameraInfo = null;
    let faceMatchResult = null;
    let imageHash = null;
    
    if (cameraId) {
      try {
        const camera = await Camera.findById(cameraId).select('+password');
        if (camera && camera.isActive && !camera.isUnderMaintenance) {
          const snapshotResult = await captureSnapshotFromCamera(camera);
          if (snapshotResult.success) {
            // Convert buffer to base64 data URL
            const base64Image = snapshotResult.imageBuffer.toString('base64');
            const contentType = snapshotResult.imageInfo.contentType || 'image/jpeg';
            cameraSnapshot = `data:${contentType};base64,${base64Image}`;
            cameraInfo = {
              cameraId: camera._id,
              cameraName: camera.name,
              cameraType: camera.type
            };
            
            // Generate image hash for deduplication
            const crypto = await import('crypto');
            imageHash = crypto.createHash('sha256').update(snapshotResult.imageBuffer).digest('hex');
            
            // Perform face matching if employee has face descriptor
            // Load employee with face descriptor
            const employeeWithFace = await Employee.findById(employee._id).select('+faceDescriptor');
            
            if (employeeWithFace && employeeWithFace.faceDescriptor && employeeWithFace.faceDescriptor.length > 0) {
              try {
                // Generate face descriptor from camera snapshot
                const detectedFaceResult = await generateFaceDescriptor(snapshotResult.imageBuffer);
                
                if (detectedFaceResult.success && detectedFaceResult.descriptor) {
                  // Get effective attendance mode config for this employee
                  const effectiveConfig = await AttendanceModeConfig.getEffectiveConfig(employee);
                  const faceRecognitionConfig = effectiveConfig.faceRecognition || {};
                  const threshold = faceRecognitionConfig.threshold || 0.40; // Use configured threshold or default to 0.40 for ArcFace
                  
                  // Compare with employee's face descriptor
                  const comparison = await compareFaceDescriptors(
                    detectedFaceResult.descriptor,
                    employeeWithFace.faceDescriptor,
                    threshold
                  );
                  
                  // Convert distance to match score (0-1, higher is better)
                  // Lower distance = higher score
                  const matchScore = 1 / (1 + comparison.distance);
                  
                  faceMatchResult = {
                    matched: comparison.match,
                    confidence: matchScore,
                    matchScore: matchScore,
                    source: 'camera',
                    threshold: threshold,
                    distance: comparison.distance
                  };
                  
                  // If face recognition is required and match fails, reject the punch
                  if (faceRecognitionConfig.enabled && faceRecognitionConfig.required && !comparison.match) {
                    return res.status(403).json({
                      success: false,
                      message: `Face recognition failed. Match score: ${(matchScore * 100).toFixed(1)}% (required: ${(threshold * 100).toFixed(1)}%)`,
                      faceMatch: faceMatchResult
                    });
                  }
                  
                  // Update method to face_manual if face matching was successful
                  if (comparison.match && method === 'manual') {
                    method = 'face_manual';
                  }
                } else {
                  // Face detection failed in camera snapshot
                  // Get effective attendance mode config for threshold
                  const effectiveConfig = await AttendanceModeConfig.getEffectiveConfig(employee);
                  const faceRecognitionConfig = effectiveConfig.faceRecognition || {};
                  const threshold = faceRecognitionConfig.threshold || 0.40;
                  
                  faceMatchResult = {
                    matched: false,
                    confidence: 0,
                    matchScore: 0,
                    source: 'camera',
                    threshold: threshold,
                    error: detectedFaceResult.error || 'Failed to detect face in camera snapshot'
                  };
                  
                  // Check if face recognition is required
                  
                  if (faceRecognitionConfig.enabled && faceRecognitionConfig.required) {
                    return res.status(403).json({
                      success: false,
                      message: `Face recognition is required but failed: ${detectedFaceResult.error || 'No face detected'}`,
                      faceMatch: faceMatchResult
                    });
                  }
                }
              } catch (faceError) {
                console.error('Face matching error:', faceError);
                // Get effective attendance mode config for threshold
                const effectiveConfig = await AttendanceModeConfig.getEffectiveConfig(employee);
                const faceRecognitionConfig = effectiveConfig.faceRecognition || {};
                const threshold = faceRecognitionConfig.threshold || 0.40;
                
                // Don't fail the punch if face matching fails (unless required)
                faceMatchResult = {
                  matched: false,
                  confidence: 0,
                  matchScore: 0,
                  source: 'camera',
                  threshold: threshold,
                  error: faceError.message || 'Face matching error'
                };
              }
            } else {
              // Employee doesn't have face descriptor - can't perform face matching
              // Get effective attendance mode config for threshold
              const effectiveConfig = await AttendanceModeConfig.getEffectiveConfig(employee);
              const faceRecognitionConfig = effectiveConfig.faceRecognition || {};
              const threshold = faceRecognitionConfig.threshold || 0.40;
              
              faceMatchResult = {
                matched: false,
                confidence: 0,
                matchScore: 0,
                source: 'camera',
                threshold: threshold,
                error: 'Employee does not have a face descriptor. Please upload a profile photo.'
              };
            }
            
            // Log camera usage
            await AuditLog.create({
              userId: req.user._id,
              userEmail: req.user.email,
              action: 'CAMERA_SNAPSHOT_FOR_ATTENDANCE',
              resource: `camera:${camera._id}`,
              ipAddress,
              userAgent: device,
              statusCode: 200,
              requestBody: {
                employeeId: employee.employeeId,
                punchType,
                cameraName: camera.name,
                cameraType: camera.type,
                imageSize: `${snapshotResult.imageInfo.width}x${snapshotResult.imageInfo.height}`,
                faceMatch: faceMatchResult?.matched || false,
                faceMatchScore: faceMatchResult?.matchScore || 0
              },
              timestamp: new Date()
            });
          }
        }
      } catch (cameraError) {
        // Log camera error but don't fail the punch (unless face recognition is required)
        console.error('Camera snapshot error:', cameraError);
        
        // Check if face recognition is required
        try {
          const effectiveConfig = await AttendanceModeConfig.getEffectiveConfig(employee);
          const faceRecognitionConfig = effectiveConfig.faceRecognition || {};
          
          if (faceRecognitionConfig.enabled && faceRecognitionConfig.required) {
            return res.status(400).json({
              success: false,
              message: `Camera snapshot failed and face recognition is required: ${cameraError.message}`
            });
          }
        } catch (configError) {
          console.error('Error checking attendance mode config:', configError);
        }
      }
    }

    // Validate geo-fence if location is provided
    let geoFenceValidation = null;
    let violation = null;

    if (location.latitude && location.longitude) {
      geoFenceValidation = await validatePunchLocation(
        employee._id,
        location.latitude,
        location.longitude,
        punchType,
        ipAddress,
        device
      );

      // If validation fails and override is not allowed
      if (!geoFenceValidation.valid && !geoFenceValidation.requiresApproval) {
        return res.status(403).json({
          success: false,
          message: geoFenceValidation.message,
          geoFenceValidation
        });
      }

      // If requires approval, create violation record
      if (geoFenceValidation.requiresApproval) {
        if (!attendance) {
          // Create attendance record first
          attendance = await Attendance.create({
            employee: employee._id,
            date: today,
            punches: [],
            shift: employee.shift || null
          });
        }

        violation = await GeoFenceViolation.create({
          employee: employee._id,
          geoFence: geoFenceValidation.fence,
          attendance: attendance._id,
          punch: {
            type: punchType,
            time: new Date()
          },
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address || ''
          },
          distance: geoFenceValidation.distance,
          ipAddress,
          device,
          status: 'pending'
        });
      }
    }

    const punchData = {
      type: punchType,
      time: new Date(),
      method: method,
      location: location,
      ipAddress,
      device
    };
    
    // Add camera information if available
    if (cameraInfo && cameraSnapshot) {
      punchData.camera = {
        cameraId: cameraInfo.cameraId,
        cameraName: cameraInfo.cameraName,
        cameraType: cameraInfo.cameraType,
        snapshotUrl: cameraSnapshot
      };
    }
    
    // Add face match result if available
    if (faceMatchResult) {
      punchData.faceMatch = faceMatchResult;
    }
    
    // Add image hash if available
    if (imageHash) {
      punchData.imageHash = imageHash;
    }
    
    // Add approval metadata for HR override
    if (method === 'hr_override' && (req.user.role === 'hr' || req.user.role === 'admin')) {
      punchData.approvalMetadata = {
        approvedBy: req.user._id,
        approvedAt: new Date(),
        reason: req.body.overrideReason || 'HR override',
        overrideType: 'hr_override'
      };
    }

    if (!attendance) {
      // If it's a punch-in, set status to 'present' immediately
      const initialStatus = punchType === 'punch_in' ? 'present' : 'absent';
      attendance = await Attendance.create({
        employee: employee._id,
        date: today,
        punches: [punchData],
        shift: employee.shift || null,
        status: initialStatus,
        workingHours: 0
      });
    } else {
      attendance.punches.push(punchData);
      // If it's a punch-in and status is still 'absent', update to 'present'
      if (punchType === 'punch_in' && attendance.status === 'absent') {
        attendance.status = 'present';
      }
      await attendance.save();
    }

    // Update violation with attendance if created
    if (violation) {
      violation.attendance = attendance._id;
      await violation.save();
    }

    // Calculate working hours and status (this will ensure correct status and metrics)
    await calculateAttendanceMetrics(attendance);

    // Create face attendance log if face recognition was used
    if (punchData.faceMatch && punchData.faceMatch.matched) {
      try {
        const { createFaceAttendanceLog } = await import('../services/faceAttendanceLog.service.js');
        await createFaceAttendanceLog(attendance, punchData, employee);
      } catch (logError) {
        console.error('Error creating face attendance log:', logError);
        // Don't fail the punch if log creation fails
      }
    }

    const updatedAttendance = await Attendance.findById(attendance._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('shift', 'name startTime endTime');

    const response = {
      success: true,
      message: geoFenceValidation?.requiresApproval 
        ? 'Punch recorded. Pending HR approval for location.'
        : 'Punch recorded successfully',
      data: updatedAttendance
    };

    if (geoFenceValidation) {
      response.geoFenceValidation = {
        valid: geoFenceValidation.valid,
        requiresApproval: geoFenceValidation.requiresApproval || false,
        distance: geoFenceValidation.distance,
        message: geoFenceValidation.message
      };
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate attendance metrics
export const calculateAttendanceMetrics = async (attendance) => {
  // If there's at least one punch-in, status should be 'present'
  const hasPunchIn = attendance.punches.some(p => p.type === 'punch_in');
  
  if (!hasPunchIn) {
    // No punch-in means absent (unless it's a holiday/weekoff/leave)
    if (attendance.status !== 'holiday' && attendance.status !== 'weekoff' && attendance.status !== 'weekend' && attendance.status !== 'leave') {
      attendance.status = 'absent';
    }
    attendance.workingHours = 0;
    await attendance.save();
    return;
  }

  // If there's only punch-in (no punch-out yet), status is 'present'
  const hasPunchOut = attendance.punches.some(p => p.type === 'punch_out');
  
  if (!hasPunchOut) {
    attendance.status = 'present';
    attendance.workingHours = 0;
    
    // Check for late arrival if shift exists
    if (attendance.shift) {
      const shift = await Shift.findById(attendance.shift);
      if (shift) {
        const punchIn = attendance.punches.find(p => p.type === 'punch_in');
        if (punchIn) {
          const shiftStart = moment(shift.startTime, 'HH:mm');
          const punchInTime = moment(punchIn.time);
          attendance.isLate = punchInTime.isAfter(shiftStart.add(15, 'minutes'));
        }
      }
    }
    
    await attendance.save();
    return;
  }

  // Both punch-in and punch-out exist
  const punches = attendance.punches.sort((a, b) => a.time - b.time);
  const punchIn = punches.find(p => p.type === 'punch_in');
  const punchOut = punches.find(p => p.type === 'punch_out');

  if (punchIn && punchOut) {
    const hours = moment(punchOut.time).diff(moment(punchIn.time), 'hours', true);
    attendance.workingHours = hours;
    attendance.status = 'present';

    // Check for late/early leave if shift exists
    if (attendance.shift) {
      const shift = await Shift.findById(attendance.shift);
      if (shift) {
        const shiftStart = moment(shift.startTime, 'HH:mm');
        const punchInTime = moment(punchIn.time);
        attendance.isLate = punchInTime.isAfter(shiftStart.add(15, 'minutes'));

        const shiftEnd = moment(shift.endTime, 'HH:mm');
        const punchOutTime = moment(punchOut.time);
        attendance.isEarlyLeave = punchOutTime.isBefore(shiftEnd.subtract(15, 'minutes'));
      }
    }
  }

  await attendance.save();
};

// Get attendance records
export const getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status, page = 1, limit = 30 } = req.query;

    const filter = {};
    
    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) filter.employee = employee._id;
    } else if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate('employee', 'firstName lastName employeeId')
        .populate('shift', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance calendar
export const getAttendanceCalendar = async (req, res) => {
  try {
    const { month, year, employeeId } = req.query;
    const targetMonth = month && year ? moment(`${year}-${month}-01`) : moment();
    const startDate = moment(targetMonth).startOf('month');
    const endDate = moment(startDate).endOf('month');

    const filter = { date: { $gte: startDate.toDate(), $lte: endDate.toDate() } };

    let employee = null;
    if (employeeId) {
      employee = await Employee.findOne({ employeeId });
    } else if (req.user.role === 'employee') {
      employee = await Employee.findOne({ userId: req.user._id });
    }

    if (!employee && req.user.role === 'employee') {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (employee) {
      filter.employee = employee._id;
    } else if (req.user.role === 'employee') {
      // Prevent unscoped queries for employees without a linked Employee record
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const leaveFilter = {
      status: 'approved',
      startDate: { $lte: endDate.toDate() },
      endDate: { $gte: startDate.toDate() }
    };
    const regularizationFilter = {
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
    };

    if (filter.employee) {
      leaveFilter.employee = filter.employee;
      regularizationFilter.employee = filter.employee;
    }

    const [attendanceRecords, leaveRequests, regularizations] = await Promise.all([
      Attendance.find(filter)
        .populate('employee', 'firstName lastName employeeId')
        .populate('shift', 'name')
        .populate('regularizationRequest', 'status')
        .sort({ date: 1 })
        .lean(),
      LeaveRequest.find(leaveFilter)
        .populate('leaveType', 'name code')
        .populate('employee', 'firstName lastName employeeId')
        .lean(),
      AttendanceRegularization.find(regularizationFilter)
        .select('date status')
        .lean()
    ]);

    const regMap = new Map();
    regularizations.forEach((reg) => {
      const key = moment(reg.date).format('YYYY-MM-DD');
      regMap.set(key, reg.status);
    });

    const attendanceMap = new Map();
    attendanceRecords.forEach((record) => {
      const key = moment(record.date).format('YYYY-MM-DD');
      attendanceMap.set(key, record);
    });

    const daysInMonth = startDate.daysInMonth();
    const calendar = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = moment(startDate).date(day);
      const key = currentDate.format('YYYY-MM-DD');
      const regularizationStatus =
        (attendanceMap.get(key)?.regularizationRequest?.status) ||
        regMap.get(key) ||
        null;

      if (attendanceMap.has(key)) {
        const record = attendanceMap.get(key);
        calendar.push({
          ...record,
          regularizationStatus
        });
        continue;
      }

      const leave = leaveRequests.find((req) =>
        currentDate.isBetween(moment(req.startDate), moment(req.endDate), 'day', '[]')
      );

      if (leave) {
        calendar.push({
          date: currentDate.toDate(),
          status: 'leave',
          leaveType: leave.leaveType ? { name: leave.leaveType.name, code: leave.leaveType.code } : null,
          punches: [],
          workingHours: 0,
          overtimeHours: 0,
          isLate: false,
          isEarlyLeave: false,
          regularizationStatus,
          source: 'leave'
        });
        continue;
      }

      const isWeekend = [0, 6].includes(currentDate.day());
      calendar.push({
        date: currentDate.toDate(),
        status: isWeekend ? 'weekoff' : 'absent',
        punches: [],
        workingHours: 0,
        overtimeHours: 0,
        isLate: false,
        isEarlyLeave: false,
        regularizationStatus,
        source: 'system'
      });
    }

    res.json({ success: true, data: calendar });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance summary
export const getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) filter.employee = employee._id;
    } else if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
    }

    const records = await Attendance.find(filter);
    
    const summary = {
      totalDays: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      halfDay: records.filter(r => r.status === 'half_day').length,
      totalWorkingHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0),
      totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtimeHours || 0), 0),
      lateCount: records.filter(r => r.isLate).length,
      earlyLeaveCount: records.filter(r => r.isEarlyLeave).length
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR Dashboard - list with filters and counts
export const getAttendanceDashboard = async (req, res) => {
  try {
    const { startDate, endDate, departmentId, employeeId, status, page = 1, limit = 30 } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (status) {
      filter.status = status;
    }

    if (employeeId) {
      const emp = await Employee.findOne({ employeeId });
      if (emp) filter.employee = emp._id;
    } else if (departmentId) {
      const empIds = await Employee.find({ department: departmentId }).distinct('_id');
      filter.employee = { $in: empIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      Attendance.find(filter)
        .populate({
          path: 'employee',
          select: 'firstName lastName employeeId department',
          populate: { path: 'department', select: 'name' }
        })
        .populate('shift', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(filter)
    ]);

    const counts = {
      present: await Attendance.countDocuments({ ...filter, status: 'present' }),
      absent: await Attendance.countDocuments({ ...filter, status: 'absent' }),
      leave: await Attendance.countDocuments({ ...filter, status: 'leave' }),
      late: await Attendance.countDocuments({ ...filter, isLate: true })
    };

    res.json({
      success: true,
      data: records,
      counts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR Dashboard Export CSV
export const exportAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate, departmentId, employeeId, status } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    if (status) {
      filter.status = status;
    }

    if (employeeId) {
      const emp = await Employee.findOne({ employeeId });
      if (emp) filter.employee = emp._id;
    } else if (departmentId) {
      const empIds = await Employee.find({ department: departmentId }).distinct('_id');
      filter.employee = { $in: empIds };
    }

    const records = await Attendance.find(filter)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('shift', 'name')
      .sort({ date: -1 });

    const header = [
      'Date',
      'Employee ID',
      'Employee Name',
      'Department',
      'Status',
      'Punch In',
      'Punch Out',
      'Working Hours',
      'Late',
      'Shift'
    ];

    const rows = records.map((r) => {
      const punchIn = r.punches?.find(p => p.type === 'punch_in');
      const punchOut = r.punches?.find(p => p.type === 'punch_out');
      const deptName = r.employee?.department?.name || '';
      const empName = `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim();
      return [
        moment(r.date).format('YYYY-MM-DD'),
        r.employee?.employeeId || '',
        empName,
        deptName,
        r.status || '',
        punchIn ? moment(punchIn.time).format('HH:mm') : '',
        punchOut ? moment(punchOut.time).format('HH:mm') : '',
        r.workingHours || 0,
        r.isLate ? 'Yes' : 'No',
        r.shift?.name || ''
      ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [header.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create attendance regularization request (Employee)
export const createRegularizationRequest = async (req, res) => {
  try {
    const { date, requestedPunchIn, requestedPunchOut, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ success: false, message: 'Date and reason are required' });
    }
    if (!requestedPunchIn && !requestedPunchOut) {
      return res.status(400).json({ success: false, message: 'Provide corrected punch in/out time' });
    }

    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const day = moment(date).startOf('day').toDate();

    const existingPending = await AttendanceRegularization.findOne({
      employee: employee._id,
      date: day,
      status: 'pending'
    });

    if (existingPending) {
      return res.status(400).json({ success: false, message: 'A pending request already exists for this date' });
    }

    let attendance = await Attendance.findOne({ employee: employee._id, date: day });
    if (!attendance) {
      attendance = await Attendance.create({
        employee: employee._id,
        date: day,
        punches: [],
        shift: employee.shift || null,
        status: 'absent'
      });
    }

    const regularization = await AttendanceRegularization.create({
      employee: employee._id,
      attendance: attendance._id,
      date: day,
      requestedPunchIn: requestedPunchIn ? new Date(requestedPunchIn) : null,
      requestedPunchOut: requestedPunchOut ? new Date(requestedPunchOut) : null,
      reason,
      status: 'pending'
    });

    attendance.regularizationRequest = regularization._id;
    await attendance.save();

    const populated = await AttendanceRegularization.findById(regularization._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'email');

    res.status(201).json({ success: true, data: populated, message: 'Regularization request submitted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance regularization requests (Employee sees own; HR/Admin sees all)
export const getRegularizationRequests = async (req, res) => {
  try {
    const { status, employeeId, page = 1, limit = 30 } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });
      filter.employee = employee._id;
    } else if (employeeId) {
      const emp = await Employee.findOne({ employeeId });
      if (emp) filter.employee = emp._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      AttendanceRegularization.find(filter)
        .populate('employee', 'firstName lastName employeeId')
        .populate('approvedBy', 'email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AttendanceRegularization.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve/Reject regularization (HR/Admin)
export const updateRegularizationStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const regularization = await AttendanceRegularization.findById(req.params.id);
    if (!regularization) {
      return res.status(404).json({ success: false, message: 'Regularization request not found' });
    }

    let attendance = await Attendance.findById(regularization.attendance);
    if (!attendance) {
      attendance = await Attendance.create({
        employee: regularization.employee,
        date: moment(regularization.date).startOf('day').toDate(),
        punches: [],
        status: 'absent'
      });
    }

    regularization.status = status;
    regularization.approvedBy = req.user._id;
    regularization.approvedAt = new Date();

    if (status === 'approved') {
      // Upsert punch timings from the request
      const punches = [...attendance.punches];

      const upsertPunch = (type, time) => {
        if (!time) return;
        const idx = punches.findIndex(p => p.type === type);
        const punchData = {
          type,
          time: new Date(time),
          location: {},
          ipAddress: 'regularization',
          device: 'regularization'
        };
        if (idx >= 0) {
          punches[idx] = { ...punches[idx], ...punchData };
        } else {
          punches.push(punchData);
        }
      };

      upsertPunch('punch_in', regularization.requestedPunchIn);
      upsertPunch('punch_out', regularization.requestedPunchOut);

      attendance.punches = punches.sort((a, b) => new Date(a.time) - new Date(b.time));
      attendance.regularizationRequest = regularization._id;
      attendance.status = 'present';

      await calculateAttendanceMetrics(attendance);
    } else {
      if (rejectionReason) {
        regularization.rejectionReason = rejectionReason;
      }
      // Keep linkage for history, do not alter attendance
    }

    await attendance.save();
    await regularization.save();

    const populated = await AttendanceRegularization.findById(regularization._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('approvedBy', 'email');

    res.json({ success: true, message: `Regularization ${status}`, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update attendance (HR/Admin only)
export const updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    Object.assign(attendance, req.body);
    await calculateAttendanceMetrics(attendance);

    const updated = await Attendance.findById(attendance._id)
      .populate('employee', 'firstName lastName employeeId');

    res.json({ success: true, message: 'Attendance updated successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
