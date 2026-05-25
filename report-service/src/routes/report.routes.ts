import { Router } from 'express';
import { reportController } from '../controller/report.controller';
import { verifyToken, requireRol } from '../middlewares/auth.middleware';
import { requireQueryParams } from '../middlewares/validation.middleware';

const router = Router();

// All report routes require a valid JWT
router.use(verifyToken);

// Detailed employee report — ADMIN and RRHH only
router.get(
  '/empleado/:id',
  requireRol('ADMIN', 'HR'),
  reportController.getReporteEmpleado,
);

// Operational reports — accessible to all authenticated roles
router.get('/estado-laboral', requireRol('ADMIN', 'HR'), reportController.getEstadoLaboral);
router.get('/vacaciones',     requireRol('ADMIN', 'HR'), reportController.getReporteVacaciones);
router.get('/contratos',      requireRol('ADMIN', 'HR'), reportController.getReporteContratos);
router.get('/turnover',       requireRol('ADMIN', 'HR'), reportController.getReporteTurnover);

// CSV export — ADMIN and RRHH only
router.get(
  '/empleados/csv',
  requireRol('ADMIN', 'HR'),
  reportController.getEmpleadosCsv,
);

export default router;
