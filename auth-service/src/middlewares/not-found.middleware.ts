import { NextFunction, Request, Response } from "express";

export const notFoundMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    res.status(404);
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    next(error);
};
