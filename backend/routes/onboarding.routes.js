import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getOnboardingTemplates,
  getOnboardingTemplate,
  createOnboardingTemplate,
  updateOnboardingTemplate,
  cloneOnboardingTemplate,
  toggleTemplateStatus,
  getTemplateVersions,
  startOnboarding,
  getOnboardingInstances,
  getOnboardingInstance,
  addCustomTask,
  getOnboardingTasks,
  createOnboardingTask,
  updateTaskStatus,
  approveTask,
  getOnboardingDashboard,
  reassignTask,
  extendDueDate,
  manuallyCompleteTask,
  addTaskComment
} from '../controllers/onboarding.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for task attachments
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'onboarding-task-' + uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

// Template management routes (Admin only)
router.get('/templates', authenticate, authorize('admin', 'hr'), getOnboardingTemplates);
router.get('/templates/:id', authenticate, authorize('admin', 'hr'), getOnboardingTemplate);
router.post('/templates', authenticate, authorize('admin'), createOnboardingTemplate);
router.put('/templates/:id', authenticate, authorize('admin'), updateOnboardingTemplate);
router.post('/templates/:id/clone', authenticate, authorize('admin'), cloneOnboardingTemplate);
router.put('/templates/:id/toggle-status', authenticate, authorize('admin'), toggleTemplateStatus);
router.get('/templates/:id/versions', authenticate, authorize('admin', 'hr'), getTemplateVersions);

// Onboarding instance routes
router.post('/start', authenticate, authorize('admin', 'hr'), startOnboarding);
router.get('/instances', authenticate, authorize('admin', 'hr'), getOnboardingInstances);
router.get('/instances/:id', authenticate, authorize('admin', 'hr'), getOnboardingInstance);
router.post('/instances/:id/tasks', authenticate, authorize('admin', 'hr'), addCustomTask);

// HR Dashboard and monitoring
router.get('/dashboard', authenticate, authorize('admin', 'hr'), getOnboardingDashboard);
router.put('/instances/:instanceId/tasks/:taskIndex/reassign', authenticate, authorize('admin', 'hr'), reassignTask);
router.put('/instances/:instanceId/tasks/:taskIndex/extend-due-date', authenticate, authorize('admin', 'hr'), extendDueDate);
router.put('/instances/:instanceId/tasks/:taskIndex/manually-complete', authenticate, authorize('admin', 'hr'), manuallyCompleteTask);
router.put('/instances/:instanceId/tasks/:taskIndex/comment', authenticate, authorize('admin', 'hr'), addTaskComment);

// Onboarding task routes (existing - for employees)
router.get('/', authenticate, getOnboardingTasks);
router.post('/', authenticate, authorize('admin', 'hr'), createOnboardingTask);
router.put('/instances/:instanceId/tasks/:taskIndex/status', authenticate, upload.single('attachment'), updateTaskStatus);
router.put('/instances/:instanceId/tasks/:taskIndex/approve', authenticate, authorize('admin', 'hr', 'manager'), approveTask);

export default router;
