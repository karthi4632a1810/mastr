import express from 'express';
import {
  punchInOut,
  getAttendance,
  getAttendanceCalendar,
  getAttendanceSummary,
  updateAttendance,
  getAttendanceDashboard,
  exportAttendanceReport,
  createRegularizationRequest,
  getRegularizationRequests,
  updateRegularizationStatus
} from '../controllers/attendance.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/punch', authenticate, punchInOut);
router.get('/', authenticate, getAttendance);
router.get('/calendar', authenticate, getAttendanceCalendar);
router.get('/summary', authenticate, getAttendanceSummary);
router.get('/dashboard', authenticate, authorize('admin', 'hr'), getAttendanceDashboard);
router.get('/export', authenticate, authorize('admin', 'hr'), exportAttendanceReport);
router.put('/:id', authenticate, authorize('admin', 'hr'), updateAttendance);
router.post('/regularizations', authenticate, createRegularizationRequest);
router.get('/regularizations', authenticate, getRegularizationRequests);
router.put('/regularizations/:id/status', authenticate, authorize('admin', 'hr'), updateRegularizationStatus);

export default router;
