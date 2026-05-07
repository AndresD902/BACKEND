import { Router, Request, Response } from 'express';
import vacationRoutes from './vacation.routes';
import { checkDatabaseConnection } from '../config/database';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const dbOk = await checkDatabaseConnection();
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    service: 'vacation-service',
    database: dbOk ? 'connected' : 'disconnected',
  });
});

router.use('/vacaciones', vacationRoutes);

export default router;
