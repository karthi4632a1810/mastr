import express from 'express';
import {
  getFaceAttendanceLogs,
  getMyFaceAttendanceLogs,
  updateHRReview,
  getFaceAttendanceStats
} from '../controllers/faceAttendanceLog.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// Get face attendance logs (HR/Admin only)
router.get('/', authenticate, authorize('admin', 'hr'), getFaceAttendanceLogs);

// Get face attendance statistics (HR/Admin only)
router.get('/stats', authenticate, authorize('admin', 'hr'), getFaceAttendanceStats);

// Get employee's own face attendance logs
router.get('/my', authenticate, getMyFaceAttendanceLogs);

// Update HR review status (HR/Admin only)
router.put('/:id/review', authenticate, authorize('admin', 'hr'), auditLog, updateHRReview);

export default router;

