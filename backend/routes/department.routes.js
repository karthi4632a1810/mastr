import express from 'express';
import {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/department.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getDepartments);
router.get('/:id', authenticate, getDepartment);
router.post('/', authenticate, authorize('admin', 'hr'), createDepartment);
router.put('/:id', authenticate, authorize('admin', 'hr'), updateDepartment);
router.delete('/:id', authenticate, authorize('admin'), deleteDepartment);

export default router;
