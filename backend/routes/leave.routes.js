import express from 'express';
import {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  previewAccrual,
  applyLeave,
  getLeaveRequests,
  updateLeaveStatus,
  getLeaveBalance,
  updateLeaveRequest,
  cancelLeaveRequest,
  // Enhanced approval dashboard functions (Story 7.3)
  getPendingApprovals,
  requestMoreInfo,
  respondToInfoRequest,
  bulkApproveLeaves,
  escalatePendingLeaves,
  getEmployeeLeaveBalance,
  getTeamLeaveCalendar,
  // Enhanced leave balance functions (Story 7.4)
  getEnhancedLeaveBalance,
  getMonthlyLeaveUsage,
  getLeaveHistory,
  getUpcomingCredits,
  getCompanyHolidays
} from '../controllers/leave.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'leave-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const router = express.Router();

// Leave Types
router.get('/types', authenticate, getLeaveTypes);
router.post('/types', authenticate, authorize('admin', 'hr'), createLeaveType);
router.put('/types/:id', authenticate, authorize('admin', 'hr'), updateLeaveType);
router.post('/types/preview', authenticate, authorize('admin', 'hr'), previewAccrual);

// Leave Applications (Employee)
router.post('/apply', authenticate, authorize('employee'), upload.single('supportingDocument'), applyLeave);
router.put('/requests/:id', authenticate, authorize('employee'), upload.single('supportingDocument'), updateLeaveRequest);
router.put('/requests/:id/cancel', authenticate, authorize('employee'), cancelLeaveRequest);
router.put('/requests/:id/respond', authenticate, authorize('employee'), respondToInfoRequest);
router.get('/balance', authenticate, getLeaveBalance);

// Enhanced Leave Balance Dashboard (Employee) - Story 7.4
router.get('/balance/enhanced', authenticate, getEnhancedLeaveBalance);
router.get('/balance/monthly-usage', authenticate, getMonthlyLeaveUsage);
router.get('/balance/history', authenticate, getLeaveHistory);
router.get('/balance/upcoming-credits', authenticate, getUpcomingCredits);
router.get('/holidays', authenticate, getCompanyHolidays);

// Leave Requests (All authenticated users)
router.get('/requests', authenticate, getLeaveRequests);

// Enhanced Approval Dashboard (HR only) - Story 7.3
router.get('/approvals', authenticate, authorize('hr'), getPendingApprovals);
router.put('/requests/:id/status', authenticate, authorize('hr'), updateLeaveStatus);
router.put('/requests/:id/request-info', authenticate, authorize('hr'), requestMoreInfo);
router.post('/bulk-approve', authenticate, authorize('hr'), bulkApproveLeaves);
router.post('/escalate', authenticate, authorize('hr'), escalatePendingLeaves);
router.get('/balance/:employeeId', authenticate, authorize('hr'), getEmployeeLeaveBalance);
router.get('/team-calendar', authenticate, authorize('hr'), getTeamLeaveCalendar);

export default router;
