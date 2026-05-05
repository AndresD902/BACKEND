import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { AppError } from "../shared/errors/app-error";
import { env } from "../config/env";


export interface AuthenticatedRequest {
    id: string;
    email: string;
    role: string;
}

export interface AuthenticatedRequestWithJwt extends Request {
    user?: AuthenticatedRequest;
}

export function authenticateToken(
    request: AuthenticatedRequestWithJwt,
    _response: Response,
    next: NextFunction
): void {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        next(new AppError('Authenticated token is required', 401));
        return;
    } 

    const token = authHeader.split(' ')[1];

    try{
        const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;

        const userId = decoded.id ?? decoded.sub;
        const role = decoded.role ?? decoded.rol;
        
        if(!userId || !decoded.email || !role) {
        next(new AppError('Invalid authenticated token payload', 401));
        return;
       }

       request.user = {
        id: userId,
        email: decoded.email,
        role,
       };
       next();
    }catch (error) {
        next(new AppError('Invalid or expired authentication token', 401));
    }
}

export function authorizeRoles(allowedRoles: string[]) {
    return (
        request: AuthenticatedRequestWithJwt,
        _response: Response,
        next: NextFunction
    ): void => {
        const userRole = request.user?.role;
        if (!userRole) {
            next(new AppError('Authenticated user role is required', 401));
            return;
        }

        if (!allowedRoles.includes(userRole)) {
            next(new AppError('You do not have permission to perform this action ', 403));
            return;
        }
        next();
    };
}