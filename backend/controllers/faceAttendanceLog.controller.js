import mongoose from 'mongoose';
import FaceAttendanceLog from '../models/faceAttendanceLog.model.js';
import Attendance from '../models/attendance.model.js';
import Employee from '../models/employee.model.js';
import Branch from '../models/branch.model.js';
import AuditLog from '../models/auditLog.model.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

// Get face attendance logs (HR view - all employees)
export const getFaceAttendanceLogs = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      employeeId,
      minMatchScore,
      maxMatchScore,
      status,
      cameraLocation,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};

    // Date range filter
    if (startDate && startDate.trim()) {
      filter['punch.time'] = filter['punch.time'] || {};
      filter['punch.time'].$gte = new Date(startDate);
    }
    if (endDate && endDate.trim()) {
      filter['punch.time'] = filter['punch.time'] || {};
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter['punch.time'].$lte = end;
    }

    // Employee filter
    if (employeeId && employeeId.trim()) {
      const employee = await Employee.findOne({ employeeId: employeeId.trim() });
      if (employee) {
        filter.employee = employee._id;
      } else {
        return res.json({ success: true, data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    }

    // Match score range filter
    if (minMatchScore !== undefined && minMatchScore !== null && minMatchScore !== '') {
      filter['faceMatch.matchScore'] = filter['faceMatch.matchScore'] || {};
      filter['faceMatch.matchScore'].$gte = parseFloat(minMatchScore);
    }
    if (maxMatchScore !== undefined && maxMatchScore !== null && maxMatchScore !== '') {
      filter['faceMatch.matchScore'] = filter['faceMatch.matchScore'] || {};
      filter['faceMatch.matchScore'].$lte = parseFloat(maxMatchScore);
    }

    // Status filter
    if (status && status.trim()) {
      const statusValue = status.trim();
      if (statusValue === 'success') {
        filter.verificationStatus = 'success';
        filter['faceMatch.matched'] = true;
      } else if (statusValue === 'failed') {
        filter.verificationStatus = 'failed';
        filter['faceMatch.matched'] = false;
      } else if (statusValue === 'fallback') {
        filter.verificationStatus = 'fallback_used';
      } else {
        filter.verificationStatus = statusValue;
      }
    }

    // Camera location filter
    if (cameraLocation && cameraLocation.trim()) {
      const locationValue = cameraLocation.trim();
      // Try to find by ObjectId first, then by string match
      try {
        // Check if it's a valid ObjectId
        if (mongoose.Types.ObjectId.isValid(locationValue)) {
          const locationObj = await Branch.findById(locationValue);
          if (locationObj) {
            filter['camera.location'] = locationObj._id;
          }
        } else {
          // Try to find by name or code
          const locationObj = await Branch.findOne({ 
            $or: [
              { name: { $regex: locationValue, $options: 'i' } },
              { code: locationValue }
            ]
          });
          if (locationObj) {
            filter['camera.location'] = locationObj._id;
          } else {
            // Fallback to locationTag search
            filter['camera.locationTag'] = { $regex: locationValue, $options: 'i' };
          }
        }
      } catch (err) {
        // If model doesn't exist or other error, try string match on locationTag
        filter['camera.locationTag'] = { $regex: locationValue, $options: 'i' };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      FaceAttendanceLog.find(filter)
        .populate('employee', 'firstName lastName employeeId email')
        .populate('camera.cameraId', 'name type location locationTag')
        .populate({
          path: 'camera.location',
          select: 'name code',
          model: 'Branch',
          strictPopulate: false
        })
        .populate('overrideInfo.approvedBy', 'email')
        .populate('hrReview.reviewedBy', 'email')
        .sort({ 'punch.time': -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FaceAttendanceLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching face attendance logs:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
};

// Get employee's own face attendance logs
export const getMyFaceAttendanceLogs = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const {
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const filter = { employee: employee._id };

    // Date range filter
    if (startDate || endDate) {
      filter['punch.time'] = {};
      if (startDate) filter['punch.time'].$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter['punch.time'].$lte = end;
      }
    }

    // Status filter (simplified for employees)
    if (status) {
      if (status === 'success') {
        filter.verificationStatus = 'success';
        filter['faceMatch.matched'] = true;
      } else if (status === 'failed') {
        filter.verificationStatus = 'failed';
        filter['faceMatch.matched'] = false;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      FaceAttendanceLog.find(filter)
        .populate('camera.cameraId', 'name locationTag')
        .populate('camera.location', 'name')
        .select('-image.snapshotUrl -image.thumbnailUrl') // Hide images from employees
        .sort({ 'punch.time': -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      FaceAttendanceLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update HR review status
export const updateHRReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['verified', 'suspicious', 'needs_followup'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: verified, suspicious, or needs_followup'
      });
    }

    const log = await FaceAttendanceLog.findById(id);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Face attendance log not found' });
    }

    log.hrReview = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      status,
      notes: notes || ''
    };

    // Update verification status based on review
    if (status === 'verified') {
      log.verificationStatus = 'verified';
      log.isFlagged = false;
    } else if (status === 'suspicious') {
      log.verificationStatus = 'suspicious';
      log.isFlagged = true;
      log.flagReason = notes || 'Marked as suspicious by HR';
    } else if (status === 'needs_followup') {
      log.verificationStatus = 'needs_followup';
      log.isFlagged = true;
      log.flagReason = notes || 'Needs follow-up';
    }

    await log.save();

    const updatedLog = await FaceAttendanceLog.findById(id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('hrReview.reviewedBy', 'email');

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE_FACE_ATTENDANCE_REVIEW',
      resource: `faceAttendanceLog:${id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        logId: id,
        employeeId: log.employee.toString(),
        status,
        notes
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'HR review updated successfully',
      data: updatedLog
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get face attendance log statistics
export const getFaceAttendanceStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter['punch.time'] = {};
      if (startDate) filter['punch.time'].$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter['punch.time'].$lte = end;
      }
    }

    const stats = await FaceAttendanceLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          success: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'failed'] }, 1, 0] }
          },
          suspicious: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'suspicious'] }, 1, 0] }
          },
          needsFollowup: {
            $sum: { $cond: [{ $eq: ['$verificationStatus', 'needs_followup'] }, 1, 0] }
          },
          avgMatchScore: { $avg: '$faceMatch.matchScore' },
          minMatchScore: { $min: '$faceMatch.matchScore' },
          maxMatchScore: { $max: '$faceMatch.matchScore' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        total: 0,
        success: 0,
        failed: 0,
        suspicious: 0,
        needsFollowup: 0,
        avgMatchScore: 0,
        minMatchScore: 0,
        maxMatchScore: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

