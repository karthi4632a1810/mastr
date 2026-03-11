import express from 'express';
import {
  getAttendanceModeConfigs,
  getAttendanceModeConfig,
  getEffectiveConfig,
  getMyEffectiveConfig,
  createAttendanceModeConfig,
  updateAttendanceModeConfig,
  deleteAttendanceModeConfig,
  getConfigSummary
} from '../controllers/attendanceModeConfig.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// Get all configurations (Admin and HR can view)
router.get('/', authenticate, authorize('admin', 'hr'), getAttendanceModeConfigs);

// Get configuration summary for dashboard
router.get('/summary', authenticate, getConfigSummary);

// Get current user's effective configuration (for employees)
router.get('/my-config', authenticate, getMyEffectiveConfig);

// Get effective configuration for an employee (Admin/HR can view any employee's config)
router.get('/effective/:employeeId', authenticate, authorize('admin', 'hr'), getEffectiveConfig);

// Get single configuration
router.get('/:id', authenticate, authorize('admin', 'hr'), getAttendanceModeConfig);

// Create configuration (Admin only)
router.post('/', authenticate, authorize('admin'), auditLog, createAttendanceModeConfig);

// Update configuration (Admin only)
router.put('/:id', authenticate, authorize('admin'), auditLog, updateAttendanceModeConfig);

// Delete configuration (Admin only)
router.delete('/:id', authenticate, authorize('admin'), auditLog, deleteAttendanceModeConfig);

export default router;

