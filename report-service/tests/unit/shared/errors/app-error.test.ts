import { describe, it, expect } from 'vitest';
import { AppError } from '../../../../src/shared/errors/app-error';
import { UnauthorizedError } from '../../../../src/shared/errors/unauthorized.error';

// ─── AppError ─────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('sets message, statusCode, and code', () => {
    const err = new AppError('Resource not found', 404, 'NOT_FOUND');

    expect(err.message).toBe('Resource not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.details).toBeUndefined();
  });

  it('stores optional details when provided', () => {
    const details = { field: 'email', constraint: 'unique' };
    const err = new AppError('Conflict', 409, 'CONFLICT', details);

    expect(err.details).toEqual(details);
  });

  it('is an instance of both Error and AppError', () => {
    const err = new AppError('test', 500, 'ERR');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('has a defined stack trace', () => {
    const err = new AppError('test', 400, 'BAD_REQUEST');
    expect(err.stack).toBeDefined();
  });

  it('accepts any type as details (object, string, array)', () => {
    expect(new AppError('e', 400, 'E', 'string detail').details).toBe('string detail');
    expect(new AppError('e', 400, 'E', [1, 2, 3]).details).toEqual([1, 2, 3]);
    expect(new AppError('e', 400, 'E', null).details).toBeNull();
  });
});

// ─── UnauthorizedError ────────────────────────────────────────────────────────

describe('UnauthorizedError', () => {
  it('defaults to 401 status and UNAUTHORIZED code', () => {
    const err = new UnauthorizedError();

    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('No autorizado');
  });

  it('accepts a custom message', () => {
    const err = new UnauthorizedError('Token expirado');
    expect(err.message).toBe('Token expirado');
  });

  it('is an instance of AppError and Error', () => {
    const err = new UnauthorizedError();

    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});
