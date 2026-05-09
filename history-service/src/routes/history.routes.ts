import { Router, Request, Response, NextFunction } from 'express';
import { historyController } from '../controllers/history.controller';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { verifyInternalApiKey, allowInternalApiKeyOrJwtRoles } from '../middlewares/internal-auth.middleware';
import { RoleName } from '../shared/enums/role.enum';

const router = Router();

// ── Escritura (fire-and-forget desde otros servicios, sin JWT) ────────────────

router.post('/cambios', verifyInternalApiKey, (req: Request, res: Response, next: NextFunction) =>
  historyController.registrarCambio(req, res, next),
);

router.post('/acciones', verifyInternalApiKey, (req: Request, res: Response, next: NextFunction) =>
  historyController.registrarAccion(req, res, next),
);

// ── Consulta de auditoría (requiere JWT) ─────────────────────────────────────

router.get(
  '/cambios/empleado/:id',
  allowInternalApiKeyOrJwtRoles(RoleName.ADMIN, RoleName.HR),
  (req: Request, res: Response, next: NextFunction) =>
    historyController.getCambiosPorEmpleado(req as AuthenticatedRequest, res, next),
);

router.get(
  '/acciones',
  allowInternalApiKeyOrJwtRoles(RoleName.ADMIN),
  (req: Request, res: Response, next: NextFunction) =>
    historyController.getAcciones(req as AuthenticatedRequest, res, next),
);

router.get(
  '/cambios',
  allowInternalApiKeyOrJwtRoles(RoleName.ADMIN, RoleName.HR),
  (req: Request, res: Response, next: NextFunction) =>
    historyController.getCambios(req as AuthenticatedRequest, res, next),
);

export default router;
