import express from 'express';
import {
  getResignationForReview,
  approveResignation,
  rejectResignation,
  requestClarification,
  respondToClarification
} from '../controllers/exitProcessing.controller.js';
import {
  getExitChecklist,
  getExitChecklists,
  updateChecklistItem,
  addChecklistItem,
  deleteChecklistItem
} from '../controllers/exitChecklist.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Exit processing routes (HR/Admin)
router.get('/resignations/:id/review', authenticate, authorize('admin', 'hr'), getResignationForReview);
router.put('/resignations/:id/approve', authenticate, authorize('admin', 'hr'), approveResignation);
router.put('/resignations/:id/reject', authenticate, authorize('admin', 'hr'), rejectResignation);
router.put('/resignations/:id/request-clarification', authenticate, authorize('admin', 'hr'), requestClarification);

// Employee clarification response
router.put('/resignations/:id/respond-clarification', authenticate, respondToClarification);

// Exit checklist routes
router.get('/checklists', authenticate, authorize('admin', 'hr'), getExitChecklists);
router.get('/checklists/resignation/:resignationId', authenticate, authorize('admin', 'hr'), getExitChecklist);
router.put('/checklists/:checklistId/items/:itemId', authenticate, authorize('admin', 'hr'), updateChecklistItem);
router.post('/checklists/:checklistId/items', authenticate, authorize('admin', 'hr'), addChecklistItem);
router.delete('/checklists/:checklistId/items/:itemId', authenticate, authorize('admin', 'hr'), deleteChecklistItem);

export default router;

