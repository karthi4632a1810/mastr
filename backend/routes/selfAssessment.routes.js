import express from 'express';
import {
  getSelfAssessment,
  getSelfAssessmentById,
  updateSelfAssessment,
  submitSelfAssessment,
  reopenSelfAssessment,
  getSelfAssessments
} from '../controllers/selfAssessment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Debug: Log route registration
console.log('Self Assessment Routes: /me route registered');

// Employee routes (must come before parameterized routes)
// Using exact match to prevent /:id from catching /me
router.get('/me', authenticate, getSelfAssessment);
router.put('/me/:id', authenticate, updateSelfAssessment);
router.post('/me/:id/submit', authenticate, submitSelfAssessment);

// HR/Admin routes
router.get('/', authenticate, authorize('admin', 'hr'), getSelfAssessments);

// Parameterized routes (must come after specific routes like /me)
router.get('/:id', authenticate, (req, res, next) => {
  // Explicitly prevent /me from being matched as /:id
  if (req.params.id === 'me') {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }
  return getSelfAssessmentById(req, res, next);
});
router.put('/:id/reopen', authenticate, authorize('admin', 'hr'), reopenSelfAssessment);

export default router;

