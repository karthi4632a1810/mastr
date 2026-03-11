import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  getAssets,
  getMyAssets,
  createAsset,
  assignAsset,
  returnAsset,
  exportAssets,
  importAssets,
  acknowledgeAsset,
  requestReturn,
  requestMaintenance,
  approveReturn,
  createTransferRequest,
  approveTransferRequest,
  createMaintenanceTicket,
  updateMaintenanceTicket,
  listMaintenanceTickets
} from '../controllers/asset.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'asset-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });
const uploadMemory = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get('/', authenticate, getAssets);
router.get('/my', authenticate, authorize('employee'), getMyAssets);
router.get('/my-assets', authenticate, authorize('employee'), getMyAssets);
router.get('/export', authenticate, authorize('admin', 'hr'), exportAssets);
router.post('/import', authenticate, authorize('admin', 'hr'), uploadMemory.single('file'), importAssets);
router.post('/', authenticate, authorize('admin', 'hr'), upload.array('attachments', 5), createAsset);
router.post('/:id/assign', authenticate, authorize('admin', 'hr'), upload.single('conditionPhoto'), assignAsset);
router.post('/:id/return', authenticate, authorize('admin', 'hr'), returnAsset);
router.post('/:id/approve-return', authenticate, authorize('admin', 'hr'), approveReturn);
router.put('/:id/acknowledge', authenticate, authorize('employee'), acknowledgeAsset);
router.post('/:id/return-request', authenticate, authorize('employee'), requestReturn);
router.post('/:id/maintenance-request', authenticate, authorize('employee'), requestMaintenance);
router.post('/transfer', authenticate, authorize('admin', 'hr'), createTransferRequest);
router.post('/transfer/:id/approve', authenticate, authorize('admin', 'hr'), approveTransferRequest);
router.get('/maintenance', authenticate, authorize('admin', 'hr'), listMaintenanceTickets);
router.post('/maintenance', authenticate, authorize('admin', 'hr'), upload.array('attachments', 5), createMaintenanceTicket);
router.put('/maintenance/:id', authenticate, authorize('admin', 'hr'), upload.array('attachments', 5), updateMaintenanceTicket);

export default router;
