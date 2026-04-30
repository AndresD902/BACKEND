import { Router } from 'express';
import healthRoutes from './health.routes';
import historyRoutes from './history.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/historial', historyRoutes);

export default router;
