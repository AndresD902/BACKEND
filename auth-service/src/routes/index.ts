import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import protectedRoutes from './protected.routes';
import internalRoutes from './internal.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/protected', protectedRoutes);
router.use('/internal', internalRoutes);

export default router;
