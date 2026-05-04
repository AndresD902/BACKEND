import { NextFunction, Request, Response } from "express";
import { ValidationError } from "shared/errors/validation.error";
import { ZodSchema } from "zod";

export function validateRequest(schema: ZodSchema) {
    return (
        request: Request,
        _response: Response,
        next: NextFunction
    
    ): void => {
        const parseBody = schema.safeParse(request.body);

        if (!parseBody.success) {
           next(
            new ValidationError(
                'Request data is invalid',
                parseBody.error.flatten().fieldErrors,
            ),
           );
           return;
        }
        
        request.body = parseBody.data;

        next();
    };
}