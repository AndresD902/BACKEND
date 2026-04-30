import { AppError } from "./app-error";

export class ValidationError extends AppError {
    constructor(message = 'Invalid request data', details?: unknown){ 
        super(message, 400, details);
    }
}