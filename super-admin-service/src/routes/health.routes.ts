import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { checkDatabaseConnection } from '../config/database';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const dbOk = await checkDatabaseConnection();
  res.status(dbOk ? 200 : 503).json({
    status:    dbOk ? 'ok' : 'degraded',
    service:   env.serviceName,
    timestamp: new Date().toISOString(),
    database:  dbOk ? 'connected' : 'disconnected',
  });
});

export default router;
