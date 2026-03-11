import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  submitResignation,
  getMyResignation,
  withdrawResignation,
  getResignations,
  getResignation,
  getNoticePeriodPolicy
} from '../controllers/resignation.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../uploads/resignations'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resignation-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed'));
    }
  }
});

// Employee routes
router.get('/me', authenticate, getMyResignation);
router.get('/me/policy', authenticate, getNoticePeriodPolicy);
router.post('/me/submit', authenticate, upload.array('documents', 5), submitResignation);
router.put('/me/withdraw', authenticate, withdrawResignation);

// HR/Admin routes
router.get('/', authenticate, authorize('admin', 'hr'), getResignations);
router.get('/:id', authenticate, authorize('admin', 'hr'), getResignation);

export default router;

