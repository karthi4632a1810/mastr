import express from 'express';
import {
  getJobOpenings,
  getJobOpening,
  createJobOpening,
  updateJobOpening,
  duplicateJobOpening,
  publishJobOpening,
  unpublishJobOpening,
  getJobHistory,
  deleteJobOpening,
  applyForJob,
  createCandidate,
  getCandidates,
  getAllCandidates,
  getCandidate,
  updateCandidate,
  updateCandidateStage,
  getCandidateStageHistory,
  getCandidatesByStage,
  scheduleInterview,
  updateInterview,
  submitInterviewFeedback,
  cancelInterview,
  getCandidateInterviews
} from '../controllers/recruitment.controller.js';
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
    cb(null, 'resume-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Allow PDF, DOC, DOCX files
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed for resumes'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

// Job Opening routes
router.get('/jobs', authenticate, getJobOpenings);
router.get('/jobs/:id', authenticate, getJobOpening);
router.post('/jobs', authenticate, authorize('admin', 'hr'), createJobOpening);
router.put('/jobs/:id', authenticate, authorize('admin', 'hr'), updateJobOpening);
router.delete('/jobs/:id', authenticate, authorize('admin', 'hr'), deleteJobOpening);
router.post('/jobs/:id/duplicate', authenticate, authorize('admin', 'hr'), duplicateJobOpening);
router.post('/jobs/:id/publish', authenticate, authorize('admin', 'hr'), publishJobOpening);
router.post('/jobs/:id/unpublish', authenticate, authorize('admin', 'hr'), unpublishJobOpening);
router.get('/jobs/:id/history', authenticate, authorize('admin', 'hr'), getJobHistory);

// Candidate routes
router.get('/candidates', authenticate, authorize('admin', 'hr'), getAllCandidates);
router.get('/candidates/:id', authenticate, authorize('admin', 'hr'), getCandidate);
router.post('/jobs/:jobOpeningId/candidates', authenticate, authorize('admin', 'hr'), upload.single('resume'), createCandidate);
router.put('/candidates/:id', authenticate, authorize('admin', 'hr'), upload.single('resume'), updateCandidate);
router.post('/jobs/:id/apply', authenticate, upload.single('resume'), applyForJob); // Public application
router.get('/jobs/:id/candidates', authenticate, authorize('admin', 'hr'), getCandidates);
router.put('/candidates/:id/stage', authenticate, authorize('admin', 'hr'), updateCandidateStage);
router.get('/candidates/:id/stage-history', authenticate, authorize('admin', 'hr'), getCandidateStageHistory);
router.get('/candidates/by-stage', authenticate, authorize('admin', 'hr'), getCandidatesByStage);

// Interview routes
router.get('/candidates/:id/interviews', authenticate, authorize('admin', 'hr'), getCandidateInterviews);
router.post('/candidates/:id/interviews', authenticate, authorize('admin', 'hr'), scheduleInterview);
router.put('/candidates/:id/interviews/:interviewId', authenticate, authorize('admin', 'hr'), updateInterview);
router.post('/candidates/:id/interviews/:interviewId/feedback', authenticate, submitInterviewFeedback);
router.post('/candidates/:id/interviews/:interviewId/cancel', authenticate, authorize('admin', 'hr'), cancelInterview);

export default router;
