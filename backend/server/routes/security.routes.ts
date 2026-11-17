import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as securityController from '../controllers/security.controller';

const router = Router();

router.get(
  '/overview',
  authenticate,
  asyncHandler(securityController.getSecurityOverview),
);

router.get(
  '/audit',
  authenticate,
  requireAdmin,
  asyncHandler(securityController.listAuditLogs),
);

export default router;
