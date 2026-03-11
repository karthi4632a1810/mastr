import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';
import {
  createShiftChange,
  getShiftChanges,
  updateShiftChangeStatus,
  modifyShiftChange
} from '../controllers/shiftChange.controller.js';

const router = express.Router();

router.post('/', authenticate, auditLog, createShiftChange);
router.get('/', authenticate, getShiftChanges);
router.put('/:id', authenticate, authorize('admin', 'hr'), auditLog, modifyShiftChange);
router.put('/:id/status', authenticate, authorize('admin', 'hr'), auditLog, updateShiftChangeStatus);

export default router;

