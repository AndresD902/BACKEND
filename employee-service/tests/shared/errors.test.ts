import { AppError } from '../../src/shared/errors/app-error';
import { ConflictError } from '../../src/shared/errors/conflict.error';
import { ForbiddenError } from '../../src/shared/errors/forbidden.error';
import { NotFoundError } from '../../src/shared/errors/not-found.error';
import { RequestValidationError } from '../../src/shared/errors/request-validation.error';
import { UnauthorizedError } from '../../src/shared/errors/unauthorized.error';

describe('shared error classes', () => {
  it('ConflictError should have statusCode 409 and correct code', () => {
    const err = new ConflictError('Cedula conflict');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT_ERROR');
    expect(err.message).toBe('Cedula conflict');
  });

  it('ForbiddenError should have statusCode 403 and correct code', () => {
    const err = new ForbiddenError('Not allowed');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN_ERROR');
  });

  it('NotFoundError should have statusCode 404 and correct code', () => {
    const err = new NotFoundError('Resource missing');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND_ERROR');
  });

  it('RequestValidationError should have statusCode 400 and correct code', () => {
    const err = new RequestValidationError('Invalid input');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('REQUEST_VALIDATION_ERROR');
  });

  it('UnauthorizedError should have statusCode 401 and default message', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Unauthorized');
  });

  it('UnauthorizedError should accept a custom message', () => {
    const err = new UnauthorizedError('Token expired');
    expect(err.message).toBe('Token expired');
  });

  it('AppError details should default to undefined', () => {
    const err = new AppError('Test', 500, 'TEST');
    expect(err.details).toBeUndefined();
  });
});
