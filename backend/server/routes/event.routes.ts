import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as eventController from '../controllers/event.controller';

const router = Router();

// Every event route requires a logged-in user.
router.use(authenticate);

router.get('/', asyncHandler(eventController.listEvents));
router.get('/:id', asyncHandler(eventController.getEvent));

// Admin-only actions
router.post('/', requireAdmin, asyncHandler(eventController.createEvent));
router.put('/:id', requireAdmin, asyncHandler(eventController.updateEvent));
router.patch(
  '/:id/status',
  requireAdmin,
  asyncHandler(eventController.updateEventStatus),
);
router.delete('/:id', requireAdmin, asyncHandler(eventController.deleteEvent));

export default router;
