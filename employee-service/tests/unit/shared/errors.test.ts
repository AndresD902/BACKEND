import { AppError } from '../../../src/shared/errors/app-error';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { ConflictError } from '../../../src/shared/errors/conflict.error';
import { UnauthorizedError } from '../../../src/shared/errors/unauthorized.error';
import { ForbiddenError } from '../../../src/shared/errors/forbidden.error';

describe('Error classes', () => {
  describe('AppError', () => {
    it('stores message, statusCode, code and details', () => {
      const err = new AppError('msg', 400, 'CODE', { field: 'x' });
      expect(err.message).toBe('msg');
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('CODE');
      expect(err.details).toEqual({ field: 'x' });
    });

    it('is an instance of Error', () => {
      const err = new AppError('msg', 500, 'CODE');
      expect(err instanceof Error).toBe(true);
      expect(err instanceof AppError).toBe(true);
    });

    it('details is undefined when not provided', () => {
      const err = new AppError('msg', 500, 'CODE');
      expect(err.details).toBeUndefined();
    });
  });

  describe('NotFoundError', () => {
    it('uses 404 and NOT_FOUND_ERROR code', () => {
      const err = new NotFoundError('not found');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND_ERROR');
      expect(err.message).toBe('not found');
      expect(err instanceof AppError).toBe(true);
    });

    it('has default message', () => {
      expect(new NotFoundError().message).toBe('Resource not found');
    });
  });

  describe('ConflictError', () => {
    it('uses 409 and CONFLICT_ERROR code', () => {
      const err = new ConflictError('conflict');
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT_ERROR');
    });

    it('has default message when called with no args', () => {
      expect(new ConflictError().message).toBe('Resource conflict');
    });

    it('accepts optional details', () => {
      const err = new ConflictError('conflict', { field: 'cedula' });
      expect(err.details).toEqual({ field: 'cedula' });
    });
  });

  describe('UnauthorizedError', () => {
    it('uses 401 and UNAUTHORIZED code', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.message).toBe('Unauthorized');
    });

    it('accepts custom message', () => {
      expect(new UnauthorizedError('No token').message).toBe('No token');
    });
  });

  describe('ForbiddenError', () => {
    it('uses 403 and FORBIDDEN_ERROR code', () => {
      const err = new ForbiddenError();
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN_ERROR');
      expect(err.message).toBe('Forbidden');
    });
  });
});
