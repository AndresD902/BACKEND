import { Router } from 'express';
import healthRoutes from './health.routes';
import employeeRoutes from './employee.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/empleados', employeeRoutes);

export default router;
