import { Router, Request, Response } from 'express';
import { employeeRepository } from '../repositories/employee.repository';
import { env } from '../config/env';

const internalRouter = Router();

internalRouter.get('/check-email', async (req: Request, res: Response) => {
  const headerKey = req.headers['x-internal-key'];

  if (headerKey !== env.internalApiKey) {
    res.status(401).json({ success: false, message: 'Invalid internal API key' });
    return;
  }

  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Query param "email" is required' });
    return;
  }

  const empleado = await employeeRepository.findByAnyEmail(email);
  res.status(200).json({ success: true, exists: !!empleado });
});

export default internalRouter;
