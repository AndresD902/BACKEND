import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const databaseConnected = await checkDatabaseConnection();

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: databaseConnected
      ? 'Auth service is running'
      : 'Auth service database is unavailable',
    data: {
      database: databaseConnected ? 'connected' : 'disconnected',
    },
  });
});

export default router;
