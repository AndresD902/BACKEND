import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { RequestValidationError } from "../shared/errors/request-validation.error";

export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors = result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            }));
           return next(new RequestValidationError('Validation failed',errors));
        }
        req.body = result.data;
        next();
    };
};