import FaceAttendanceLog from '../models/faceAttendanceLog.model.js';
import Attendance from '../models/attendance.model.js';
import Camera from '../models/camera.model.js';

// Create face attendance log from attendance punch
export async function createFaceAttendanceLog(attendance, punch, employee) {
  try {
    // Only create log if face recognition was used
    if (!punch.faceMatch || !punch.faceMatch.matched) {
      return null;
    }

    // Check if log already exists (prevent duplicates)
    const existingLog = await FaceAttendanceLog.findOne({
      attendance: attendance._id,
      'punch.time': punch.time,
      'punch.type': punch.type
    });

    if (existingLog) {
      return existingLog;
    }

    // Get camera info if available
    let cameraInfo = null;
    if (punch.camera?.cameraId) {
      const camera = await Camera.findById(punch.camera.cameraId)
        .populate('location', 'name code');
      
      if (camera) {
        cameraInfo = {
          cameraId: camera._id,
          cameraName: camera.name || punch.camera.cameraName,
          cameraType: camera.type || punch.camera.cameraType,
          location: camera.location?._id || null,
          locationTag: camera.locationTag || camera.location?.name || ''
        };
      }
    }

    // Determine verification status
    // Use 0.60 (60%) threshold for auto punch-in verification
    const threshold = punch.faceMatch.threshold || 0.60;
    let verificationStatus = 'pending';
    if (punch.faceMatch.matched && punch.faceMatch.matchScore >= threshold) {
      verificationStatus = 'success';
    } else if (!punch.faceMatch.matched) {
      verificationStatus = 'failed';
    } else if (punch.method === 'hr_override' || punch.approvalMetadata) {
      verificationStatus = 'fallback_used';
    }

    // Create thumbnail from snapshot (simplified - in production, use image processing library)
    let thumbnailUrl = null;
    if (punch.camera?.snapshotUrl) {
      // For now, use the same URL. In production, generate actual thumbnail
      thumbnailUrl = punch.camera.snapshotUrl;
    }

    const log = await FaceAttendanceLog.create({
      employee: employee._id,
      attendance: attendance._id,
      punch: {
        type: punch.type,
        time: punch.time
      },
      faceMatch: {
        matched: punch.faceMatch.matched || false,
        confidence: punch.faceMatch.confidence || 0,
        matchScore: punch.faceMatch.matchScore || 0,
        threshold: threshold,
        source: punch.faceMatch.source || 'camera'
      },
      image: {
        snapshotUrl: punch.camera?.snapshotUrl || null,
        imageHash: punch.imageHash || null,
        thumbnailUrl: thumbnailUrl,
        imageSource: punch.camera ? 'office_camera' : 'employee_device'
      },
      camera: cameraInfo,
      device: {
        ipAddress: punch.ipAddress || null,
        userAgent: punch.device || null,
        deviceType: punch.device ? (punch.device.includes('Mobile') ? 'mobile' : 'desktop') : null
      },
      location: punch.location || null,
      verificationStatus,
      method: punch.method || 'face_auto',
      overrideInfo: punch.approvalMetadata ? {
        applied: true,
        approvedBy: punch.approvalMetadata.approvedBy || null,
        approvedAt: punch.approvalMetadata.approvedAt || null,
        reason: punch.approvalMetadata.reason || '',
        overrideType: punch.approvalMetadata.overrideType || 'hr_override'
      } : {
        applied: false
      }
    });

    return log;
  } catch (error) {
    console.error('Error creating face attendance log:', error);
    return null;
  }
}

// Sync existing attendance records to face attendance logs
export async function syncAttendanceToFaceLogs(employeeId = null, startDate = null, endDate = null) {
  try {
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const attendances = await Attendance.find(filter)
      .populate('employee')
      .sort({ date: -1 });

    let created = 0;
    let skipped = 0;

    for (const attendance of attendances) {
      if (!attendance.punches || attendance.punches.length === 0) continue;

      for (const punch of attendance.punches) {
        // Only process face-based punches
        if (punch.method && (punch.method === 'face_auto' || punch.method === 'face_manual')) {
          if (punch.faceMatch && punch.faceMatch.matched) {
            const log = await createFaceAttendanceLog(attendance, punch, attendance.employee);
            if (log) {
              created++;
            } else {
              skipped++;
            }
          }
        }
      }
    }

    return { created, skipped, total: attendances.length };
  } catch (error) {
    console.error('Error syncing attendance to face logs:', error);
    throw error;
  }
}

