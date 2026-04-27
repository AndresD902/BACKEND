import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';
import { env } from '../config/env';
//add
const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const databaseConnected = await checkDatabaseConnection();

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected
      ? `${env.serviceName} is running`
      : `${env.serviceName} database is unavailable`,
    data: {
      service: env.serviceName,
      database: databaseConnected ? 'connected' : 'disconnected',
    },
  });
});

export default router;
