import express from 'express';
import {
  getOrCreateSettlement,
  updateSettlement,
  addSettlementComponent,
  removeSettlementComponent,
  markAsPrepared,
  markAsVerified,
  markAsPaid,
  getSettlements,
  getMySettlement,
  generateSettlementPDF
} from '../controllers/finalSettlement.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// HR/Finance routes
router.get('/', authenticate, authorize('admin', 'hr'), getSettlements);
router.get('/resignation/:resignationId', authenticate, authorize('admin', 'hr'), getOrCreateSettlement);
router.put('/:settlementId', authenticate, authorize('admin', 'hr'), updateSettlement);
router.post('/:settlementId/components', authenticate, authorize('admin', 'hr'), addSettlementComponent);
router.delete('/:settlementId/components/:componentId', authenticate, authorize('admin', 'hr'), removeSettlementComponent);
router.put('/:settlementId/prepared', authenticate, authorize('admin', 'hr'), markAsPrepared);
router.put('/:settlementId/verified', authenticate, authorize('admin', 'hr'), markAsVerified);
router.put('/:settlementId/paid', authenticate, authorize('admin', 'hr'), markAsPaid);
router.get('/:settlementId/pdf', authenticate, authorize('admin', 'hr'), generateSettlementPDF);

// Employee route
router.get('/me/settlement', authenticate, getMySettlement);

export default router;

