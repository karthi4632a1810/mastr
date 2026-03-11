import express from 'express';
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany
} from '../controllers/company.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';

const router = express.Router();

router.get('/', authenticate, getCompanies);
router.get('/:id', authenticate, getCompany);
router.post('/', authenticate, authorize('admin'), auditLog, createCompany);
router.put('/:id', authenticate, authorize('admin'), auditLog, updateCompany);
router.delete('/:id', authenticate, authorize('admin'), auditLog, deleteCompany);

export default router;

