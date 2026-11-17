import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// Every admin route requires an admin account.
router.use(authenticate, requireAdmin);

router.get('/stats', asyncHandler(adminController.getStats));
router.get('/users', asyncHandler(adminController.listUsers));
router.patch('/users/:id/status', asyncHandler(adminController.updateUserStatus));
router.patch('/users/:id/role', asyncHandler(adminController.updateUserRole));
router.delete('/users/:id', asyncHandler(adminController.deleteUser));

export default router;
