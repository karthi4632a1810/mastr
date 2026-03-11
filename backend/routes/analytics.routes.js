import express from 'express';
import {
  getDashboardStats,
  getHeadcountTrend,
  getDepartmentStrength,
  getShiftOccupancy,
  getOvertimeTrends,
  getShiftCompliance,
  getShiftChangeSummary,
  getStaffingSignals,
  exportShiftAnalytics
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/dashboard', authenticate, getDashboardStats);
router.get('/headcount', authenticate, getHeadcountTrend);
router.get('/departments', authenticate, getDepartmentStrength);
router.get('/shift/occupancy', authenticate, getShiftOccupancy);
router.get('/shift/overtime', authenticate, getOvertimeTrends);
router.get('/shift/compliance', authenticate, getShiftCompliance);
router.get('/shift/changes', authenticate, getShiftChangeSummary);
router.get('/shift/staffing', authenticate, getStaffingSignals);
router.get('/shift/export', authenticate, exportShiftAnalytics);

export default router;
