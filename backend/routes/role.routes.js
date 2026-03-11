import express from 'express';
import {
  getRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
  getRolePermissionsSummary
} from '../controllers/role.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// All role routes require admin access
router.get('/', authenticate, authorize('admin'), getRoles);
router.get('/summary', authenticate, authorize('admin'), getRolePermissionsSummary);
router.get('/:id', authenticate, authorize('admin'), getRole);
router.post('/', authenticate, authorize('admin'), auditLog, createRole);
router.put('/:id', authenticate, authorize('admin'), auditLog, updateRole);
router.put('/:id/permissions', authenticate, authorize('admin'), auditLog, assignPermissions);
router.delete('/:id', authenticate, authorize('admin'), auditLog, deleteRole);

export default router;

