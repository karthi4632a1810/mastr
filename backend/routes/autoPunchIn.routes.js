import express from 'express';
import {
  processAutoPunchInFromCamera,
  processAutoPunchInFromImage,
  getAutoPunchInConfig,
  updateAutoPunchInConfig
} from '../controllers/autoPunchIn.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// Process auto punch-in from camera (can be called by system/camera service)
router.post('/process/camera', processAutoPunchInFromCamera);

// Process auto punch-in from uploaded image (can be called by system/camera service)
router.post('/process/image', processAutoPunchInFromImage);

// Get auto punch-in configuration (Admin/HR)
router.get('/config', authenticate, authorize('admin', 'hr'), getAutoPunchInConfig);

// Update auto punch-in configuration (Admin only)
router.put('/config', authenticate, authorize('admin'), auditLog, updateAutoPunchInConfig);

export default router;

