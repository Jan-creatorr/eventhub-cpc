import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getDashboard } from '../controllers/dashboard.controller';

const router = Router();

router.get('/', authenticate, asyncHandler(getDashboard));

export default router;
