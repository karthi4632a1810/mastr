import express from 'express';
import {
  getPerformanceCycles,
  getPerformanceCycle,
  createPerformanceCycle,
  updatePerformanceCycle,
  activatePerformanceCycle,
  freezePerformanceCycle,
  closePerformanceCycle,
  getEligibleEmployees,
  syncEmployees,
  manageEmployeeInclusion
} from '../controllers/performanceCycle.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require admin authentication
router.get('/', authenticate, authorize('admin', 'hr'), getPerformanceCycles);
router.get('/:id', authenticate, authorize('admin', 'hr'), getPerformanceCycle);
router.post('/', authenticate, authorize('admin'), createPerformanceCycle);
router.put('/:id', authenticate, authorize('admin'), updatePerformanceCycle);
router.put('/:id/activate', authenticate, authorize('admin'), activatePerformanceCycle);
router.put('/:id/freeze', authenticate, authorize('admin'), freezePerformanceCycle);
router.put('/:id/close', authenticate, authorize('admin'), closePerformanceCycle);
router.get('/:id/eligible-employees', authenticate, authorize('admin', 'hr'), getEligibleEmployees);
router.post('/:id/sync-employees', authenticate, authorize('admin'), syncEmployees);
router.post('/:id/manage-employees', authenticate, authorize('admin'), manageEmployeeInclusion);

export default router;

