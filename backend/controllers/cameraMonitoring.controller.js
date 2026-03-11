import {
  startCameraMonitoring,
  stopCameraMonitoring,
  startAllCameraMonitoring,
  stopAllCameraMonitoring,
  getMonitoringStatus,
  getCameraMonitoringStatus
} from '../services/cameraMonitoring.service.js';
import Camera from '../models/camera.model.js';
import CameraAssignment from '../models/cameraAssignment.model.js';
import Attendance from '../models/attendance.model.js';
import moment from 'moment';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

// Start monitoring a camera
export const startMonitoring = async (req, res) => {
  try {
    const { cameraId, intervalSeconds } = req.body;

    if (!cameraId) {
      return res.status(400).json({
        success: false,
        message: 'Camera ID is required'
      });
    }

    const result = await startCameraMonitoring(cameraId, intervalSeconds || 5);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Stop monitoring a camera
export const stopMonitoring = async (req, res) => {
  try {
    const { cameraId } = req.params;

    const result = stopCameraMonitoring(cameraId);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Start monitoring all cameras
export const startAllMonitoring = async (req, res) => {
  try {
    const result = await startAllCameraMonitoring();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Stop monitoring all cameras
export const stopAllMonitoring = async (req, res) => {
  try {
    const result = stopAllCameraMonitoring();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get monitoring status
export const getStatus = async (req, res) => {
  try {
    const result = getMonitoringStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get camera monitoring status
export const getCameraStatus = async (req, res) => {
  try {
    const { cameraId } = req.params;
    const result = getCameraMonitoringStatus(cameraId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get real-time attendance monitoring data
export const getRealTimeAttendance = async (req, res) => {
  try {
    const { cameraId, startDate, endDate } = req.query;

    const today = moment().startOf('day').toDate();
    const now = new Date();

    // Build query
    const query = {
      date: today,
      'punches.type': 'punch_in',
      'punches.method': 'face_auto'
    };

    if (cameraId) {
      query['punches.camera.cameraId'] = cameraId;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: moment(startDate).startOf('day').toDate(),
        $lte: moment(endDate).endOf('day').toDate()
      };
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId email department branch')
      .sort({ 'punches.time': -1 })
      .limit(100);

    // Process data
    const todayPunches = [];
    const recentPunches = [];

    for (const record of attendanceRecords) {
      const punchIn = record.punches.find(p => p.type === 'punch_in' && p.method === 'face_auto');
      if (punchIn) {
        const punchData = {
          id: record._id,
          employee: {
            id: record.employee._id,
            name: `${record.employee.firstName} ${record.employee.lastName}`,
            employeeId: record.employee.employeeId,
            department: record.employee.department?.name || 'N/A',
            branch: record.employee.branch?.name || 'N/A'
          },
          punchTime: punchIn.time,
          camera: punchIn.camera || {},
          faceMatch: punchIn.faceMatch || {},
          location: punchIn.location || null
        };

        if (moment(punchIn.time).isSame(today, 'day')) {
          todayPunches.push(punchData);
        }

        // Recent punches (last 1 hour)
        if (moment(punchIn.time).isAfter(moment().subtract(1, 'hour'))) {
          recentPunches.push(punchData);
        }
      }
    }

    // Get camera assignments
    const assignments = await CameraAssignment.find({
      isActive: true,
      autoPunchInEnabled: true
    })
      .populate('camera', 'name type isActive')
      .populate('employee', 'firstName lastName employeeId');

    const cameraStats = {};
    for (const assignment of assignments) {
      const cameraId = assignment.camera._id.toString();
      if (!cameraStats[cameraId]) {
        cameraStats[cameraId] = {
          camera: assignment.camera,
          totalAssignments: 0,
          activeAssignments: 0,
          todayPunches: 0
        };
      }
      cameraStats[cameraId].totalAssignments++;
      if (assignment.autoPunchInEnabled) {
        cameraStats[cameraId].activeAssignments++;
      }
    }

    // Count today's punches per camera
    for (const punch of todayPunches) {
      if (punch.camera?.cameraId) {
        const cameraId = punch.camera.cameraId.toString();
        if (cameraStats[cameraId]) {
          cameraStats[cameraId].todayPunches++;
        }
      }
    }

    res.json({
      success: true,
      data: {
        todayPunches,
        recentPunches,
        cameraStats: Object.values(cameraStats),
        summary: {
          totalToday: todayPunches.length,
          totalRecent: recentPunches.length,
          totalCameras: Object.keys(cameraStats).length,
          totalAssignments: assignments.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

