import express from 'express';
import { getGrievances, createGrievance, updateGrievanceStatus } from '../controllers/grievance.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getGrievances);
router.post('/', authenticate, createGrievance);
router.put('/:id/status', authenticate, authorize('admin', 'hr'), updateGrievanceStatus);

export default router;
