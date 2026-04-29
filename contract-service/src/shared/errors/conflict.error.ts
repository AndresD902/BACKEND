import { AppError } from "./app-error";

export class ConflictError extends AppError {
    constructor(message = 'Resource conflict'){ 
        super(message, 409);
    }
}