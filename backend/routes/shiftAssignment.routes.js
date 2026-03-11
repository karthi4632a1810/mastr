import express from 'express';
import {
  assignShifts,
  setDefaultShift,
  getRoster,
  publishRoster,
  createShiftGroup,
  getShiftGroups,
  updateShiftGroup,
  deleteShiftGroup
} from '../controllers/shiftAssignment.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/assign', authenticate, authorize('admin', 'hr'), assignShifts);
router.post('/default', authenticate, authorize('admin', 'hr'), setDefaultShift);
router.get('/', authenticate, getRoster);
router.post('/publish', authenticate, authorize('admin', 'hr'), publishRoster);

// Shift groups
router.post('/groups', authenticate, authorize('admin', 'hr'), createShiftGroup);
router.get('/groups', authenticate, authorize('admin', 'hr'), getShiftGroups);
router.put('/groups/:id', authenticate, authorize('admin', 'hr'), updateShiftGroup);
router.delete('/groups/:id', authenticate, authorize('admin', 'hr'), deleteShiftGroup);

export default router;

