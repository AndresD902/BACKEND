import { NextFunction, Response, Request } from "express";
import { ForbiddenError } from "../shared/errors/forbidden.error";
import { AuthenticatedRequest } from "./auth.middleware";
import { RoleName } from "../entities/role.entity";



export const authorize = (...allowedRoles: RoleName[]) => {
    return (
        req: AuthenticatedRequest,
        _res: Response,
        next: NextFunction
    ): void => {
        if (!req.user) {
          return next(new ForbiddenError('User not authenticated'));
        }

        if (!allowedRoles.includes(req.user.role as RoleName)) {
          return next(new ForbiddenError('User does not have permission to access this resource'));
        }
        next();
    };
};