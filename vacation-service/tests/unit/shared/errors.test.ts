import { AppError } from '../../../src/shared/errors/app-error';
import { BadRequestError } from '../../../src/shared/errors/bad-request.error';
import { ConflictError } from '../../../src/shared/errors/conflict.error';
import { ForbiddenError } from '../../../src/shared/errors/forbidden.error';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { UnauthorizedError } from '../../../src/shared/errors/unauthorized.error';

describe('AppError', () => {
  it('creates an error with all properties', () => {
    const err = new AppError('test', 422, 'TEST_CODE', { field: 'x' });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('TEST_CODE');
    expect(err.details).toEqual({ field: 'x' });
  });

  it('preserves prototype chain for instanceof checks', () => {
    const err = new BadRequestError();
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('BadRequestError', () => {
  it('defaults to 400 status and BAD_REQUEST_ERROR code', () => {
    const err = new BadRequestError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST_ERROR');
    expect(err.message).toBe('Bad request');
  });

  it('accepts custom message and details', () => {
    const err = new BadRequestError('invalid field', { field: 'email' });
    expect(err.message).toBe('invalid field');
    expect(err.details).toEqual({ field: 'email' });
  });
});

describe('ConflictError', () => {
  it('returns 409', () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT_ERROR');
  });
});

describe('ForbiddenError', () => {
  it('returns 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN_ERROR');
  });
});

describe('NotFoundError', () => {
  it('returns 404', () => {
    const err = new NotFoundError();
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND_ERROR');
  });
});

describe('UnauthorizedError', () => {
  it('returns 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });
});
