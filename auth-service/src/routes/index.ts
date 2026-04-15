import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import protectedRoutes from './protected.routes';


const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/protected', protectedRoutes);

export default router;
