import { authenticate, AuthenticatedRequest } from "../middlewares/auth.middleware";
import {Router, Response} from "express";
import { authorize } from '../middlewares/authorize.middleware';
import { RoleName } from "../entities/role.entity";

const protectedRouter = Router();

protectedRouter.get(
    '/me',
    authenticate,
    (req: AuthenticatedRequest, res: Response) => {
        res.status(200).json({
            success: true,
            message: 'Authenticated user data retrived successfully',
            "data": {
                "sub": "...",
                "email": "...",
                "roles": "ADMIN"
            }
        });
    },
)

protectedRouter.get(
    '/admin-only',
    authenticate,
    authorize(RoleName.ADMIN),
    (req: AuthenticatedRequest, res: Response) => {
        res.status(200).json({
            success: true,
            message: 'Welcome, admin user',
        });
    },
);

protectedRouter.get(
    '/hr-or-admin',
    authenticate,
    authorize(RoleName.HR, RoleName.ADMIN),
    (_req: AuthenticatedRequest, res: Response) => {
        res.status(200).json({
            success: true,
            message: 'Welcome, HR or admin user',
        });
    },
);

export default protectedRouter;