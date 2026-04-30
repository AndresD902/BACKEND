import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';
import { env } from '../config/env';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const dbOk = await checkDatabaseConnection();
  res.status(dbOk ? 200 : 503).json({
    service: env.serviceName,
    status: dbOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default router;
