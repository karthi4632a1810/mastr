import express from 'express';
import {
  getEmployees,
  getEmployee,
  getMyProfile,
  createMyProfile,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadProfilePhoto,
  uploadMyProfilePhoto,
  regenerateFaceDescriptor,
  uploadDocument,
  bulkImportEmployees,
  downloadCredentials,
  downloadTemplate,
  assignEmployeeToUnits,
  createChangeRequest,
  getChangeRequests,
  reviewChangeRequest
} from '../controllers/employee.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateCreateEmployee, validateUpdateEmployee } from '../middleware/employeeValidation.middleware.js';
import { auditLog } from '../middleware/audit.middleware.js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Memory storage for MongoDB (base64) uploads
const memoryStorage = multer.memoryStorage();

// Disk storage for face recognition processing (temporary)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: memoryStorage, // Use memory storage for MongoDB
  fileFilter: (req, file, cb) => {
    // Allow only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Disk upload for face recognition (needs file path)
const uploadDisk = multer({
  storage: diskStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

const router = express.Router();

router.get('/', authenticate, getEmployees);
router.get('/me', authenticate, getMyProfile); // Must be before /:id route
router.post('/me', authenticate, createMyProfile); // Create own profile
router.post('/me/photo', authenticate, upload.single('photo'), uploadMyProfilePhoto); // Employee uploads own photo
router.get('/download-template', authenticate, authorize('admin', 'hr'), downloadTemplate);

// Change request routes - MUST be before /:id route to avoid route conflicts
router.get('/change-requests', authenticate, getChangeRequests);
router.post('/change-requests', authenticate, auditLog, createChangeRequest);
router.put('/change-requests/:requestId', authenticate, authorize('admin', 'hr'), auditLog, reviewChangeRequest);

router.get('/:id', authenticate, getEmployee);
router.post('/', authenticate, authorize('admin', 'hr'), auditLog, validateCreateEmployee, createEmployee);
router.put('/:id', authenticate, authorize('admin', 'hr'), auditLog, validateUpdateEmployee, updateEmployee);
router.delete('/:id', authenticate, authorize('admin'), auditLog, deleteEmployee);
router.post('/:id/photo', authenticate, authorize('admin', 'hr'), auditLog, uploadDisk.single('photo'), uploadProfilePhoto);
router.post('/:id/regenerate-face-descriptor', authenticate, authorize('admin', 'hr'), auditLog, regenerateFaceDescriptor);
router.post('/:id/documents', authenticate, authorize('admin', 'hr'), auditLog, upload.single('document'), uploadDocument);
router.post('/bulk-import', authenticate, authorize('admin', 'hr'), auditLog, upload.single('file'), bulkImportEmployees);
router.post('/download-credentials', authenticate, authorize('admin', 'hr'), auditLog, downloadCredentials);
router.put('/:employeeId/assign-units', authenticate, authorize('admin', 'hr'), auditLog, assignEmployeeToUnits);

export default router;
