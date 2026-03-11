import express from 'express';
import {
  getGeoFences,
  getGeoFence,
  createGeoFence,
  updateGeoFence,
  deleteGeoFence,
  getViolations,
  reviewViolation,
  getGeoFenceReports,
  getMyGeoFences
} from '../controllers/geoFence.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

// Employee endpoint - accessible to all authenticated users
router.get('/my-fences', authenticate, getMyGeoFences);

// All geo-fence routes require HR/Admin access
router.get('/', authenticate, authorize('admin', 'hr'), getGeoFences);
router.get('/reports', authenticate, authorize('admin', 'hr'), getGeoFenceReports);
router.get('/violations', authenticate, authorize('admin', 'hr'), getViolations);
router.get('/:id', authenticate, authorize('admin', 'hr'), getGeoFence);
router.post('/', authenticate, authorize('admin', 'hr'), auditLog, createGeoFence);
router.put('/:id', authenticate, authorize('admin', 'hr'), auditLog, updateGeoFence);
router.delete('/:id', authenticate, authorize('admin', 'hr'), auditLog, deleteGeoFence);
router.put('/violations/:id/review', authenticate, authorize('admin', 'hr'), auditLog, reviewViolation);

export default router;

