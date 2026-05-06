import { Router } from 'express';
import healthRoutes from './health.routes';
import employeeRoutes from './employee.routes';
import internalRoutes from './internal.routes';
import departmentRoutes from './department.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/empleados', employeeRoutes);
router.use('/internal', internalRoutes);
router.use('/departamentos', departmentRoutes);

export default router;
