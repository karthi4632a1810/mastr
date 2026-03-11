import express from 'express';
import {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  approveGoal,
  rejectGoal,
  reopenGoal,
  getEmployeeWeightage,
  addComment
} from '../controllers/goal.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.get('/', authenticate, getGoals);
router.get('/my-goals', authenticate, getGoals);
router.get('/:id', authenticate, getGoal);
router.post('/', authenticate, authorize('admin', 'hr', 'employee'), createGoal);
router.put('/:id', authenticate, authorize('admin', 'hr', 'employee'), updateGoal);
router.put('/:id/approve', authenticate, authorize('admin', 'hr'), approveGoal);
router.put('/:id/reject', authenticate, authorize('admin', 'hr'), rejectGoal);
router.put('/:id/reopen', authenticate, authorize('admin', 'hr'), reopenGoal);
router.get('/weightage/:performanceCycleId/:employeeId', authenticate, getEmployeeWeightage);
router.post('/:id/comments', authenticate, addComment);

export default router;

