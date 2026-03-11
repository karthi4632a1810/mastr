import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getExpenses, createExpense, updateExpenseStatus, getExpenseById, getMyExpenses } from '../controllers/expense.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'expense-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

const router = express.Router();

router.get('/', authenticate, getExpenses);
router.get('/my-expenses', authenticate, getMyExpenses);
router.get('/:id', authenticate, getExpenseById);
router.post('/', authenticate, upload.array('attachments', 10), createExpense);
router.put('/:id/status', authenticate, authorize('admin', 'hr'), updateExpenseStatus);

export default router;
