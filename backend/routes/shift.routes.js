import express from 'express';
import {
  getShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift,
  cloneShift
} from '../controllers/shift.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getShifts);
router.get('/:id', authenticate, getShift);
router.post('/', authenticate, authorize('admin', 'hr'), createShift);
router.put('/:id', authenticate, authorize('admin', 'hr'), updateShift);
router.post('/:id/clone', authenticate, authorize('admin', 'hr'), cloneShift);
router.delete('/:id', authenticate, authorize('admin'), deleteShift);

export default router;
