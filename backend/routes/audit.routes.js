import express from 'express';
import { getAuditLogs, getAuditLog } from '../controllers/audit.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, authorize('admin'), getAuditLogs);
router.get('/:id', authenticate, authorize('admin'), getAuditLog);

export default router;
