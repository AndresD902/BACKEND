import { NextFunction } from "express";
import { AppError } from "../shared/errors/app-error";


export function errorHandler(
    error: unknown,
    _request: any,
    response: any,
    _next: NextFunction
): void {
    if (error instanceof AppError) {
        response.status(error.statusCode).json({
            success: false,
            error:error.message,
            details: error.details
        });
        return;
    }

    console.error(error);
    return response.status(500).json({
        success: false,
        error: 'Internal server error'
    });
}