import express from 'express';
import {
  getCameras,
  getCamera,
  createCamera,
  updateCamera,
  deleteCamera,
  validateCamera,
  testCameraEndpoint,
  getCamerasByLocation,
  captureSnapshot,
  getSnapshotWithDetection,
  getCameraDetections,
  getCameraLiveDetections,
  getCameraLiveStream,
  getCameraPreview,
  getCameraLiveDetectionStream
} from '../controllers/camera.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// Get all cameras (HR/Admin can view)
router.get('/', authenticate, authorize('admin', 'hr'), getCameras);

// Get cameras by location (for attendance punch)
router.get('/location/:locationId', authenticate, getCamerasByLocation);

// Test camera endpoint (without saving)
router.post('/test', authenticate, authorize('admin', 'hr'), testCameraEndpoint);

// Get single camera
router.get('/:id', authenticate, authorize('admin', 'hr'), getCamera);

// Capture snapshot from camera (for attendance)
router.post('/:id/capture', authenticate, auditLog, captureSnapshot);

// Get snapshot with face detection (for monitoring preview)
router.get('/:id/snapshot-with-detection', authenticate, authorize('admin', 'hr'), getSnapshotWithDetection);

// Get face detections for camera
router.get('/:id/detections', authenticate, authorize('admin', 'hr'), getCameraDetections);

// Live face detections (stream-based)
router.get('/:id/live-detections', authenticate, authorize('admin', 'hr'), getCameraLiveDetections);

// Live stream passthrough (MJPEG/http video)
router.get('/:id/live', authenticate, authorize('admin', 'hr'), getCameraLiveStream);

// Real-time preview with face detection overlays
router.get('/:id/preview', authenticate, authorize('admin', 'hr'), getCameraPreview);

// Real-time live detection stream (SSE)
router.get('/:id/live-stream', authenticate, authorize('admin', 'hr'), getCameraLiveDetectionStream);

// Validate camera endpoint
router.post('/:id/validate', authenticate, authorize('admin', 'hr'), auditLog, validateCamera);

// Create camera (Admin/HR only)
router.post('/', authenticate, authorize('admin', 'hr'), auditLog, createCamera);

// Update camera (Admin/HR only)
router.put('/:id', authenticate, authorize('admin', 'hr'), auditLog, updateCamera);

// Delete camera (Admin/HR only)
router.delete('/:id', authenticate, authorize('admin', 'hr'), auditLog, deleteCamera);

export default router;

