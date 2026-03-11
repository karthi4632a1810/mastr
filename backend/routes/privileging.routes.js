import express from 'express';
import {
  // Privilege Categories
  getPrivilegeCategories,
  getPrivilegeCategory,
  createPrivilegeCategory,
  updatePrivilegeCategory,
  // Privilege Committees
  getPrivilegeCommittees,
  getPrivilegeCommittee,
  createPrivilegeCommittee,
  updatePrivilegeCommittee,
  // Privilege Requests
  getPrivilegeRequests,
  getPrivilegeRequest,
  createPrivilegeRequest,
  reviewByHod,
  reviewByCommittee,
  reviewByMedicalSuperintendent,
  // Doctor Privileges
  getDoctorPrivileges,
  getDoctorPrivilege,
  suspendPrivilege,
  liftSuspension,
  revokePrivilege,
  getExpiringPrivileges,
  // Dashboard
  getPrivilegingDashboard
} from '../controllers/privileging.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// ===== PRIVILEGE CATEGORIES =====
router.get('/categories', authenticate, getPrivilegeCategories);
router.get('/categories/:id', authenticate, getPrivilegeCategory);
router.post('/categories', authenticate, authorize('admin', 'hr'), createPrivilegeCategory);
router.put('/categories/:id', authenticate, authorize('admin', 'hr'), updatePrivilegeCategory);

// ===== PRIVILEGE COMMITTEES =====
router.get('/committees', authenticate, getPrivilegeCommittees);
router.get('/committees/:id', authenticate, getPrivilegeCommittee);
router.post('/committees', authenticate, authorize('admin', 'hr'), createPrivilegeCommittee);
router.put('/committees/:id', authenticate, authorize('admin', 'hr'), updatePrivilegeCommittee);

// ===== PRIVILEGE REQUESTS =====
router.get('/requests', authenticate, getPrivilegeRequests);
router.get('/requests/:id', authenticate, getPrivilegeRequest);
router.post('/requests', authenticate, createPrivilegeRequest);
router.put('/requests/:id/hod-review', authenticate, authorize('admin', 'hr'), reviewByHod);
router.put('/requests/:id/committee-review', authenticate, authorize('admin', 'hr'), reviewByCommittee);
router.put('/requests/:id/ms-review', authenticate, authorize('admin'), reviewByMedicalSuperintendent);

// ===== DOCTOR PRIVILEGES =====
router.get('/privileges', authenticate, getDoctorPrivileges);
router.get('/privileges/:id', authenticate, getDoctorPrivilege);
router.get('/privileges/expiring', authenticate, getExpiringPrivileges);
router.put('/privileges/:id/suspend', authenticate, authorize('admin'), suspendPrivilege);
router.put('/privileges/:id/lift-suspension', authenticate, authorize('admin'), liftSuspension);
router.put('/privileges/:id/revoke', authenticate, authorize('admin'), revokePrivilege);

// ===== DASHBOARD =====
router.get('/dashboard', authenticate, getPrivilegingDashboard);

export default router;

