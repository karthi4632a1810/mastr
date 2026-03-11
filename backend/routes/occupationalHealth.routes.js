import express from 'express';
import {
  // Immunization Records
  getImmunizationRecords,
  getImmunizationRecord,
  createImmunizationRecord,
  updateImmunizationRecord,
  getDueImmunizations,
  // Health Checkups
  getHealthCheckups,
  getHealthCheckup,
  createHealthCheckup,
  updateHealthCheckup,
  getDueHealthCheckups,
  // Occupational Exposures
  getOccupationalExposures,
  getOccupationalExposure,
  createOccupationalExposure,
  updateOccupationalExposure,
  addFollowUpTest,
  // Incident Reports
  getIncidentReports,
  getIncidentReport,
  createIncidentReport,
  updateIncidentReport,
  updateIncidentInvestigation,
  updateCapa,
  closeIncidentReport,
  // Dashboard
  getOccupationalHealthDashboard
} from '../controllers/occupationalHealth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// ===== IMMUNIZATION RECORDS =====
router.get('/immunizations', authenticate, getImmunizationRecords);
router.get('/immunizations/due', authenticate, getDueImmunizations);
router.get('/immunizations/:id', authenticate, getImmunizationRecord);
router.post('/immunizations', authenticate, authorize('admin', 'hr'), createImmunizationRecord);
router.put('/immunizations/:id', authenticate, authorize('admin', 'hr'), updateImmunizationRecord);

// ===== HEALTH CHECKUPS =====
router.get('/checkups', authenticate, getHealthCheckups);
router.get('/checkups/due', authenticate, getDueHealthCheckups);
router.get('/checkups/:id', authenticate, getHealthCheckup);
router.post('/checkups', authenticate, authorize('admin', 'hr'), createHealthCheckup);
router.put('/checkups/:id', authenticate, authorize('admin', 'hr'), updateHealthCheckup);

// ===== OCCUPATIONAL EXPOSURES =====
router.get('/exposures', authenticate, getOccupationalExposures);
router.get('/exposures/:id', authenticate, getOccupationalExposure);
router.post('/exposures', authenticate, createOccupationalExposure);
router.put('/exposures/:id', authenticate, authorize('admin', 'hr'), updateOccupationalExposure);
router.post('/exposures/:id/followup', authenticate, authorize('admin', 'hr'), addFollowUpTest);

// ===== INCIDENT REPORTS =====
router.get('/incidents', authenticate, getIncidentReports);
router.get('/incidents/:id', authenticate, getIncidentReport);
router.post('/incidents', authenticate, createIncidentReport);
router.put('/incidents/:id', authenticate, authorize('admin', 'hr'), updateIncidentReport);
router.put('/incidents/:id/investigation', authenticate, authorize('admin', 'hr'), updateIncidentInvestigation);
router.put('/incidents/:id/capa', authenticate, authorize('admin', 'hr'), updateCapa);
router.put('/incidents/:id/close', authenticate, authorize('admin', 'hr'), closeIncidentReport);

// ===== DASHBOARD =====
router.get('/dashboard', authenticate, getOccupationalHealthDashboard);

export default router;

