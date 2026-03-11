import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createRotation,
  getRotations,
  updateRotation,
  deleteRotation
} from '../controllers/shiftRotation.controller.js';

const router = express.Router();

router.post('/', authenticate, authorize('admin', 'hr'), createRotation);
router.get('/', authenticate, authorize('admin', 'hr'), getRotations);
router.put('/:id', authenticate, authorize('admin', 'hr'), updateRotation);
router.delete('/:id', authenticate, authorize('admin'), deleteRotation);

export default router;

