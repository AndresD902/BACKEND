import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { RoleName } from '../entities/role.entity';
import { userController } from '../controllers/user.controller';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { createManagedUserSchema } from '../schemas/auth.schema';

const userRoutes = Router();

userRoutes.post('/', authenticate, authorize(RoleName.ADMIN), validateRequest(createManagedUserSchema), userController.create);
userRoutes.get('/', authenticate, authorize(RoleName.ADMIN), userController.findAll);
userRoutes.get('/:id', authenticate, authorize(RoleName.ADMIN, RoleName.HR), userController.findById);
userRoutes.patch('/:id/deactivate', authenticate, authorize(RoleName.ADMIN), userController.deactivate);
userRoutes.patch('/:id/activate', authenticate, authorize(RoleName.ADMIN), userController.activate);

export default userRoutes;
