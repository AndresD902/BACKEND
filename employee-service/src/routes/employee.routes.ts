import { Router, Request, Response, NextFunction } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { verifyToken, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { requireRol } from '../middlewares/authorize.middleware';
import { RoleName } from '../shared/enums/role.enum';

 //feature/employee-service-s3-documents
const router = Router();

router.use(verifyToken);

// Rutas sin parámetro dinámico primero (evitar colisión con /:id)
router.post(
  '/presigned-url',
  requireRol(RoleName.ADMIN, RoleName.RRHH),
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.generarPresignedUrl(req as AuthenticatedRequest, res, next),
);

router.get(
  '/documentos/:docId/url',
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.generarUrlDescarga(req as AuthenticatedRequest, res, next),
);

// CRUD empleados
router.get('/', (req: Request, res: Response, next: NextFunction) =>
  employeeController.getAll(req as AuthenticatedRequest, res, next),
);

router.get('/:id', (req: Request, res: Response, next: NextFunction) =>
  employeeController.getById(req as AuthenticatedRequest, res, next),
);

router.post(
  '/',
  requireRol(RoleName.ADMIN, RoleName.RRHH),
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.create(req as AuthenticatedRequest, res, next),
);

router.patch(
  '/:id',
  requireRol(RoleName.ADMIN, RoleName.RRHH),
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.update(req as AuthenticatedRequest, res, next),
);

router.delete(
  '/:id',
  requireRol(RoleName.ADMIN),
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.softDelete(req as AuthenticatedRequest, res, next),
);


//nuevas funcionalidades
// Cargos y salarios
router.get('/:id/cargo-actual', (req: Request, res: Response, next: NextFunction) =>
  employeeController.getCargoActual(req as AuthenticatedRequest, res, next),
);
//nuevas funcionalidades
router.get(
  '/:id/historial-cargo',
  requireRol(RoleName.ADMIN, RoleName.RRHH),
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.getHistorialCargos(req as AuthenticatedRequest, res, next),
);
//nuevas funcionalidades
router.post(
  '/:id/cargo',
  requireRol(RoleName.ADMIN, RoleName.RRHH),
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.crearCargo(req as AuthenticatedRequest, res, next),
);

// Documentos
router.get('/:id/documentos', (req: Request, res: Response, next: NextFunction) =>
  employeeController.getDocumentos(req as AuthenticatedRequest, res, next),
);

router.post(
  '/:id/documentos',
  requireRol(RoleName.ADMIN, RoleName.RRHH),
  (req: Request, res: Response, next: NextFunction) =>
    employeeController.confirmarDocumento(req as AuthenticatedRequest, res, next),
);

export default router;
