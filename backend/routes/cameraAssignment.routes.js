import express from 'express';
import {
  getCameraAssignments,
  getCameraAssignmentsByCamera,
  getCameraAssignmentsByEmployee,
  createCameraAssignment,
  updateCameraAssignment,
  deleteCameraAssignment,
  bulkAssignCameras
} from '../controllers/cameraAssignment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// Get all camera assignments (employees can query their own, admin/hr can query all)
router.get('/', authenticate, getCameraAssignments);

// Get assignments for a specific camera
router.get('/camera/:cameraId', authenticate, authorize('admin', 'hr'), getCameraAssignmentsByCamera);

// Get assignments for a specific employee
router.get('/employee/:employeeId', authenticate, authorize('admin', 'hr'), getCameraAssignmentsByEmployee);

// Bulk assign cameras
router.post('/bulk', authenticate, authorize('admin', 'hr'), auditLog, bulkAssignCameras);

// Create camera assignment
router.post('/', authenticate, authorize('admin', 'hr'), auditLog, createCameraAssignment);

// Update camera assignment
router.put('/:id', authenticate, authorize('admin', 'hr'), auditLog, updateCameraAssignment);

// Delete camera assignment
router.delete('/:id', authenticate, authorize('admin', 'hr'), auditLog, deleteCameraAssignment);

export default router;

