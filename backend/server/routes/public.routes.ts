import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as publicController from '../controllers/public.controller';

const router = Router();

router.get('/events', asyncHandler(publicController.listPublicEvents));
router.get('/stats', asyncHandler(publicController.getPublicStats));

export default router;
