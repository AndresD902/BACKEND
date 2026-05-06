import { Router } from 'express';
import { departamentoController } from '../controllers/department.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { requireRol } from '../middlewares/authorize.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { createDepartamentoSchema, updateDepartamentoSchema } from '../schemas/department.schema';
import { RoleName } from '../shared/enums/role.enum';

const router = Router();

router.use(verifyToken);

router.get('/colombia', departamentoController.getColombiaList);
router.get('/', departamentoController.getAll);
router.get('/:id', departamentoController.getById);
router.post('/', requireRol(RoleName.ADMIN), validateBody(createDepartamentoSchema), departamentoController.create);
router.patch('/:id', requireRol(RoleName.ADMIN), validateBody(updateDepartamentoSchema), departamentoController.update);
router.delete('/:id', requireRol(RoleName.ADMIN), departamentoController.delete);

export default router;
