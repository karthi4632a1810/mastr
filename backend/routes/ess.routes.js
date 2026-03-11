import express from 'express';
import { 
  getESSDashboard, 
  getTeamCelebrations, 
  getAttendanceTrends,
  getMyRequests,
  getRequestDetail,
  cancelRequest,
  reopenRequest,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/ess.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// ESS Dashboard - Story 15.1
router.get('/dashboard', authenticate, getESSDashboard);

// Team celebrations (birthdays/anniversaries)
router.get('/celebrations', authenticate, getTeamCelebrations);

// Attendance trends for charts
router.get('/attendance-trends', authenticate, getAttendanceTrends);

// My Requests - Story 15.2
router.get('/requests', authenticate, getMyRequests);
router.get('/requests/:type/:id', authenticate, getRequestDetail);
router.put('/requests/:type/:id/cancel', authenticate, cancelRequest);
router.put('/requests/:type/:id/reopen', authenticate, reopenRequest);

// Notifications
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/:id/read', authenticate, markNotificationAsRead);
router.put('/notifications/read-all', authenticate, markAllNotificationsAsRead);

export default router;

