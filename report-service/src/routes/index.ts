import { Router } from 'express';
import reportRoutes from './report.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health',   healthRoutes);
router.use('/reportes', reportRoutes);

export default router;
