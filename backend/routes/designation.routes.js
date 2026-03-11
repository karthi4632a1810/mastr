import express from 'express';
import {
  getDesignations,
  getDesignation,
  createDesignation,
  updateDesignation,
  deleteDesignation
} from '../controllers/designation.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getDesignations);
router.get('/:id', authenticate, getDesignation);
router.post('/', authenticate, authorize('admin', 'hr'), createDesignation);
router.put('/:id', authenticate, authorize('admin', 'hr'), updateDesignation);
router.delete('/:id', authenticate, authorize('admin'), deleteDesignation);

export default router;
