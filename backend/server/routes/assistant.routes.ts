import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { assistantRateLimit } from '../middleware/security';
import { asyncHandler } from '../utils/asyncHandler';
import * as assistantController from '../controllers/assistant.controller';

const router = Router();

router.post(
  '/chat',
  authenticate,
  assistantRateLimit,
  asyncHandler(assistantController.chat),
);

export default router;
