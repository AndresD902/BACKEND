import { Router, Request, Response, NextFunction } from 'express';
import { historyController } from '../controllers/history.controller';
import { verifyToken, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { requireRol } from '../middlewares/authorize.middleware';
import { RoleName } from '../shared/enums/role.enum';

const router = Router();

// ── Escritura (fire-and-forget desde otros servicios, sin JWT) ────────────────

router.post('/cambios', (req: Request, res: Response, next: NextFunction) =>
  historyController.registrarCambio(req, res, next),
);

router.post('/acciones', (req: Request, res: Response, next: NextFunction) =>
  historyController.registrarAccion(req, res, next),
);

// ── Consulta de auditoría (requiere JWT) ─────────────────────────────────────

router.get(
  '/cambios/empleado/:id',
  verifyToken,
  requireRol(RoleName.ADMIN, RoleName.HR),
  (req: Request, res: Response, next: NextFunction) =>
    historyController.getCambiosPorEmpleado(req as AuthenticatedRequest, res, next),
);

router.get(
  '/acciones',
  verifyToken,
  requireRol(RoleName.ADMIN),
  (req: Request, res: Response, next: NextFunction) =>
    historyController.getAcciones(req as AuthenticatedRequest, res, next),
);

export default router;
