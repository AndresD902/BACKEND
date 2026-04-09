import { AppError } from "./app-error";

export class RequestValidationError extends AppError {
    constructor(message  = 'Validation failed', details?: unknown) {
        super(message, 400, 'REQUEST_VALIDATION_ERROR', details);
    }
}