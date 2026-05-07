import { Router } from 'express';
import { auditoriaController } from '../controller/auditoria.controller';
import { verifySuperAdminToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifySuperAdminToken);

router.get('/acciones', auditoriaController.acciones);
router.get('/cambios',  auditoriaController.cambios);

export default router;
