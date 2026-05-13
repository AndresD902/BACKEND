import { describe, it, expect } from 'vitest';
import { AppError } from '../../src/shared/errors/app-error';
import { UnauthorizedError } from '../../src/shared/errors/unauthorized.error';
import { ForbiddenError } from '../../src/shared/errors/forbidden.error';

describe('AppError', () => {
  it('stores message, statusCode and code', () => {
    const err = new AppError('algo falló', 422, 'UNPROCESSABLE');
    expect(err.message).toBe('algo falló');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('UNPROCESSABLE');
  });

  it('is an instance of Error', () => {
    expect(new AppError('msg', 500, 'ERR')).toBeInstanceOf(Error);
  });

  it('preserves prototype chain for instanceof checks', () => {
    const err = new AppError('msg', 400, 'BAD');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('UnauthorizedError', () => {
  it('uses default message when none is provided', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Unauthorized');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('uses custom message when provided', () => {
    const err = new UnauthorizedError('Token inválido');
    expect(err.message).toBe('Token inválido');
  });

  it('is an instance of AppError and Error', () => {
    const err = new UnauthorizedError();
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('ForbiddenError', () => {
  it('uses default message when none is provided', () => {
    const err = new ForbiddenError();
    expect(err.message).toBe('Forbidden');
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('uses custom message when provided', () => {
    const err = new ForbiddenError('Acceso denegado');
    expect(err.message).toBe('Acceso denegado');
  });

  it('is an instance of AppError and Error', () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });
});
