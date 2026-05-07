import { Router, Request, Response } from 'express';
import { env } from '../config/env';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    service: env.serviceName,
    timestamp: new Date().toISOString(),
    note: 'stateless aggregator — no own database',
  });
});

export default router;
