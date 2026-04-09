import { AppError } from "./app-error";

export class forbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403, "FORBIDDEN_ERROR",);
    }
}