import { Router } from 'express';
import authRoutes from './auth.routes';
import eventRoutes from './event.routes';
import registrationRoutes from './registration.routes';
import adminRoutes from './admin.routes';
import dashboardRoutes from './dashboard.routes';
import publicRoutes from './public.routes';
import assistantRoutes from './assistant.routes';
import securityRoutes from './security.routes';

const router = Router();

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/admin', adminRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/assistant', assistantRoutes);
router.use('/security', securityRoutes);

export default router;
