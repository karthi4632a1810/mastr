import express from 'express';
import {
  getPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionsByModule
} from '../controllers/permission.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// All permission routes require admin access
router.get('/', authenticate, authorize('admin'), getPermissions);
router.get('/module/:module', authenticate, authorize('admin'), getPermissionsByModule);
router.get('/:id', authenticate, authorize('admin'), getPermission);
router.post('/', authenticate, authorize('admin'), auditLog, createPermission);
router.put('/:id', authenticate, authorize('admin'), auditLog, updatePermission);
router.delete('/:id', authenticate, authorize('admin'), auditLog, deletePermission);

export default router;

