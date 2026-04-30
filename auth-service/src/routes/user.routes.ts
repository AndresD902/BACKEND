import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { RoleName } from '../entities/role.entity';
import { userController } from '../controllers/user.controller';

const userRoutes = Router();

userRoutes.get('/', authenticate, authorize(RoleName.ADMIN), userController.findAll);
userRoutes.get('/:id', authenticate, authorize(RoleName.ADMIN, RoleName.HR), userController.findById);
userRoutes.patch('/:id/deactivate', authenticate, authorize(RoleName.ADMIN), userController.deactivate);
userRoutes.patch('/:id/activate', authenticate, authorize(RoleName.ADMIN), userController.activate);

export default userRoutes;
