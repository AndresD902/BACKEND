import { Router } from 'express';
import healthRoutes    from './health.routes';
import authRoutes      from './auth.routes';
import empresaRoutes   from './empresa.routes';
import auditoriaRoutes from './auditoria.routes';

const router = Router();

router.use('/health',      healthRoutes);
router.use('/super-admin', authRoutes);
router.use('/super-admin/empresas',   empresaRoutes);
router.use('/super-admin/auditoria',  auditoriaRoutes);

export default router;
