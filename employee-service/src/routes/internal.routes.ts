import { Router, Request, Response } from 'express';
import { employeeRepository } from '../repositories/employee.repository';
import { env } from '../config/env';

const internalRouter = Router();

function hasValidInternalKey(req: Request): boolean {
  const headerKey = req.headers['x-internal-key'];
  return headerKey === env.internalApiKey;
}

internalRouter.get('/check-email', async (req: Request, res: Response) => {
  if (!hasValidInternalKey(req)) {
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

internalRouter.get('/employee-id-by-email', async (req: Request, res: Response) => {
  if (!hasValidInternalKey(req)) {
    res.status(401).json({ success: false, message: 'Invalid internal API key' });
    return;
  }

  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ success: false, message: 'Query param "email" is required' });
    return;
  }

  const empleado = await employeeRepository.findByAnyEmail(email);
  if (!empleado) {
    res.status(404).json({ success: false, message: 'Employee not found' });
    return;
  }

  res.status(200).json({ success: true, id: empleado.id });
});

internalRouter.get('/empresas/:empresaId/empleados', async (req: Request, res: Response) => {
  if (!hasValidInternalKey(req)) {
    res.status(401).json({ success: false, message: 'Invalid internal API key' });
    return;
  }

  const empresaId = Number(req.params.empresaId);
  if (!Number.isInteger(empresaId) || empresaId <= 0) {
    res.status(400).json({ success: false, message: 'Invalid empresaId' });
    return;
  }

  const empleados = await employeeRepository.findAll(1000, 0, { empresaId });
  res.status(200).json({ success: true, data: empleados });
});

export default internalRouter;
