import { AppError } from './app-error';

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 400, 'BAD_REQUEST_ERROR', details);
  }
}
