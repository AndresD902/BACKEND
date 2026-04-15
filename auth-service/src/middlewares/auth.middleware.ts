import { NextFunction, Request, Response } from "express";
import { UnauthorizedError } from "../shared/errors/unauthorized.error";
import { verifyJwtToken } from "../utils/jwt.util";


export interface AuthenticatedUser {
    sub: string;
    email: string;
    role: string;
}

export interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
}

export const authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new UnauthorizedError('Authorization headeris required');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        throw new UnauthorizedError('Invalid authorization format');
    }
    try {
        const payload = verifyJwtToken(token);
        req.user = {
            sub: payload.sub,
            email: payload.email,
            role: payload.role,
        };
        next();
    } catch{
        return next(new UnauthorizedError('Invalid or expired token'));
    }
}