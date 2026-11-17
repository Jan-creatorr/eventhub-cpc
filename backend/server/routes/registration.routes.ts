import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as registrationController from '../controllers/registration.controller';

const router = Router();

router.use(authenticate);

// User routes
router.get('/me', asyncHandler(registrationController.listMyRegistrations));
router.post('/:eventId', asyncHandler(registrationController.registerForEvent));
router.delete('/:id', asyncHandler(registrationController.cancelRegistration));

// Admin routes
router.get('/', requireAdmin, asyncHandler(registrationController.listAllRegistrations));
router.get(
  '/event/:eventId',
  requireAdmin,
  asyncHandler(registrationController.listEventParticipants),
);

export default router;
