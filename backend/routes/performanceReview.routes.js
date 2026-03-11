import express from 'express';
import {
  getPerformanceReviews,
  getPerformanceReview,
  getOrCreatePerformanceReview,
  updateFinalRating,
  finalizePerformanceReview,
  unlockPerformanceReview,
  getMyPerformanceReview,
  createReviewsForCycle
} from '../controllers/performanceReview.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Debug: Log route registration
console.log('Performance Review Routes: /me/review route registered');

// HR/Admin routes (specific routes first)
router.get('/', authenticate, authorize('admin', 'hr'), getPerformanceReviews);
router.post('/', authenticate, authorize('admin', 'hr'), getOrCreatePerformanceReview);
router.post('/create-for-cycle', authenticate, authorize('admin', 'hr'), createReviewsForCycle);

// Employee route (must come before /:id to avoid route conflict)
router.get('/me/review', authenticate, getMyPerformanceReview);

// Parameterized routes (must come after specific routes)
router.get('/:id', authenticate, authorize('admin', 'hr'), (req, res, next) => {
  console.log('Route /:id matched with id:', req.params.id);
  return getPerformanceReview(req, res, next);
});
router.put('/:id/rating', authenticate, authorize('admin', 'hr'), updateFinalRating);
router.put('/:id/finalize', authenticate, authorize('admin', 'hr'), finalizePerformanceReview);
router.put('/:id/unlock', authenticate, authorize('admin', 'hr'), unlockPerformanceReview);

export default router;

