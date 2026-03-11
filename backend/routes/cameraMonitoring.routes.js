import express from 'express';
import {
  startMonitoring,
  stopMonitoring,
  startAllMonitoring,
  stopAllMonitoring,
  getStatus,
  getCameraStatus,
  getRealTimeAttendance
} from '../controllers/cameraMonitoring.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Real-time attendance monitoring (HR/Admin only)
router.get('/attendance', authenticate, authorize('admin', 'hr'), getRealTimeAttendance);

// Get monitoring status
router.get('/status', authenticate, authorize('admin', 'hr'), getStatus);

// Get camera monitoring status
router.get('/status/:cameraId', authenticate, authorize('admin', 'hr'), getCameraStatus);

// Start monitoring a camera
router.post('/start', authenticate, authorize('admin', 'hr'), startMonitoring);

// Stop monitoring a camera
router.post('/stop/:cameraId', authenticate, authorize('admin', 'hr'), stopMonitoring);

// Start monitoring all cameras
router.post('/start-all', authenticate, authorize('admin', 'hr'), startAllMonitoring);

// Stop monitoring all cameras
router.post('/stop-all', authenticate, authorize('admin', 'hr'), stopAllMonitoring);

export default router;

