import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authRateLimit, cookieOriginGuard } from '../middleware/security';
import { asyncHandler } from '../utils/asyncHandler';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post(
  '/register',
  authRateLimit,
  asyncHandler(authController.register),
);
router.post('/login', authRateLimit, asyncHandler(authController.login));
router.post(
  '/refresh',
  cookieOriginGuard,
  asyncHandler(authController.refresh),
);
router.post('/logout', cookieOriginGuard, asyncHandler(authController.logout));
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser));

export default router;
