import express from 'express';
import { getDocuments, uploadDocument } from '../controllers/document.controller.js';
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
    cb(null, 'doc-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const router = express.Router();

router.get('/', authenticate, getDocuments);
router.post('/', authenticate, authorize('admin', 'hr'), upload.single('document'), uploadDocument);

export default router;
