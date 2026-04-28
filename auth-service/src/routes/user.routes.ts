import { Router } from 'express';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/authorize.middleware';
import { RoleName } from '../entities/role.entity';
import { userController } from '../controllers/user.controller';

const userRoutes = Router();

userRoutes.get('/', authenticate, authorize(RoleName.ADMIN), (req, res, next) =>
  userController.findAll(req as AuthenticatedRequest, res, next),
);

userRoutes.get('/:id', authenticate, authorize(RoleName.ADMIN, RoleName.HR), (req, res, next) =>
  userController.findById(req as AuthenticatedRequest, res, next),
);

userRoutes.patch('/:id/deactivate', authenticate, authorize(RoleName.ADMIN), (req, res, next) =>
  userController.deactivate(req as AuthenticatedRequest, res, next),
);

userRoutes.patch('/:id/activate', authenticate, authorize(RoleName.ADMIN), (req, res, next) =>
  userController.activate(req as AuthenticatedRequest, res, next),
);

export default userRoutes;
