import { Router } from 'express';
import { empresaController } from '../controller/empresa.controller';
import { verifySuperAdminToken } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { createEmpresaSchema } from '../dtos/create-empresa.dto';
import { updateEmpresaSchema, updateEstadoSchema } from '../dtos/update-empresa.dto';
import { createAdminSchema } from '../dtos/create-admin.dto';

const router = Router();

// All empresa routes require a valid super_admin JWT
router.use(verifySuperAdminToken);

router.get('/',                         empresaController.listar);
router.post('/', validateBody(createEmpresaSchema), empresaController.crear);
router.get('/:id',                      empresaController.obtener);
router.patch('/:id', validateBody(updateEmpresaSchema), empresaController.actualizar);
router.patch('/:id/estado', validateBody(updateEstadoSchema), empresaController.actualizarEstado);
router.post('/:id/admins', validateBody(createAdminSchema), empresaController.agregarAdmin);
router.get('/:id/empleados',            empresaController.listarEmpleados);

export default router;
