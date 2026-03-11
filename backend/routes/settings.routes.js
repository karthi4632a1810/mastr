import express from 'express';
import {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getSetting,
  updateSetting,
  getAllSettings
} from '../controllers/settings.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// Branch routes
router.get('/branches', authenticate, getBranches);
router.get('/branches/:id', authenticate, getBranch);
router.post('/branches', authenticate, authorize('admin', 'hr'), createBranch);
router.put('/branches/:id', authenticate, authorize('admin', 'hr'), updateBranch);
router.delete('/branches/:id', authenticate, authorize('admin'), deleteBranch);

// Settings routes
router.get('/settings', authenticate, authorize('admin'), getAllSettings);
router.get('/settings/:key', authenticate, getSetting);
router.put('/settings/:key', authenticate, authorize('admin'), auditLog, updateSetting);

export default router;
