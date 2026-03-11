import express from 'express';
import {
  // Training Programs
  getTrainingPrograms,
  getTrainingProgram,
  createTrainingProgram,
  updateTrainingProgram,
  deleteTrainingProgram,
  // Training Records
  getTrainingRecords,
  getTrainingRecord,
  createTrainingRecord,
  updateTrainingRecord,
  issueCertificate,
  getExpiringTrainings,
  // Competency Matrix
  getCompetencyMatrices,
  getCompetencyMatrix,
  createCompetencyMatrix,
  updateCompetencyMatrix,
  deleteCompetencyMatrix,
  // Competency Assessments
  getCompetencyAssessments,
  getCompetencyAssessment,
  createCompetencyAssessment,
  updateCompetencyAssessment,
  // Training Effectiveness
  getTrainingEffectiveness,
  createTrainingEffectiveness,
  updateTrainingEffectiveness,
  // Dashboard
  getTrainingDashboard
} from '../controllers/training.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// ===== TRAINING PROGRAMS =====
router.get('/programs', authenticate, getTrainingPrograms);
router.get('/programs/:id', authenticate, getTrainingProgram);
router.post('/programs', authenticate, authorize('admin', 'hr'), createTrainingProgram);
router.put('/programs/:id', authenticate, authorize('admin', 'hr'), updateTrainingProgram);
router.delete('/programs/:id', authenticate, authorize('admin', 'hr'), deleteTrainingProgram);

// ===== TRAINING RECORDS =====
router.get('/records', authenticate, getTrainingRecords);
router.get('/records/:id', authenticate, getTrainingRecord);
router.post('/records', authenticate, authorize('admin', 'hr'), createTrainingRecord);
router.put('/records/:id', authenticate, authorize('admin', 'hr'), updateTrainingRecord);
router.post('/records/:id/certificate', authenticate, authorize('admin', 'hr'), issueCertificate);
router.get('/records/expiring', authenticate, getExpiringTrainings);

// ===== COMPETENCY MATRIX =====
router.get('/competency-matrices', authenticate, getCompetencyMatrices);
router.get('/competency-matrices/:id', authenticate, getCompetencyMatrix);
router.post('/competency-matrices', authenticate, authorize('admin', 'hr'), createCompetencyMatrix);
router.put('/competency-matrices/:id', authenticate, authorize('admin', 'hr'), updateCompetencyMatrix);
router.delete('/competency-matrices/:id', authenticate, authorize('admin', 'hr'), deleteCompetencyMatrix);

// ===== COMPETENCY ASSESSMENTS =====
router.get('/competency-assessments', authenticate, getCompetencyAssessments);
router.get('/competency-assessments/:id', authenticate, getCompetencyAssessment);
router.post('/competency-assessments', authenticate, authorize('admin', 'hr'), createCompetencyAssessment);
router.put('/competency-assessments/:id', authenticate, authorize('admin', 'hr'), updateCompetencyAssessment);

// ===== TRAINING EFFECTIVENESS =====
router.get('/effectiveness', authenticate, getTrainingEffectiveness);
router.post('/effectiveness', authenticate, authorize('admin', 'hr'), createTrainingEffectiveness);
router.put('/effectiveness/:id', authenticate, authorize('admin', 'hr'), updateTrainingEffectiveness);

// ===== DASHBOARD =====
router.get('/dashboard', authenticate, getTrainingDashboard);

export default router;

