import { describe, it, expect } from 'vitest';
import { AppError } from '../../../src/shared/errors/app-error';
import { ConflictError } from '../../../src/shared/errors/conflict.error';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { UnauthorizedError } from '../../../src/shared/errors/unauthorized.error';

describe('AppError', () => {
  it('almacena statusCode, code y message', () => {
    const err = new AppError('Algo falló', 422, 'UNPROCESSABLE');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('UNPROCESSABLE');
    expect(err.message).toBe('Algo falló');
    expect(err instanceof Error).toBe(true);
  });

  it('almacena detalles opcionales', () => {
    const details = [{ field: 'email', message: 'requerido' }];
    const err = new AppError('Datos inválidos', 400, 'VALIDATION_ERROR', details);
    expect(err.details).toEqual(details);
  });

  it('details es undefined cuando no se provee', () => {
    const err = new AppError('msg', 500, 'INTERNAL');
    expect(err.details).toBeUndefined();
  });

  it('es instancia de Error', () => {
    const err = new AppError('test', 400, 'TEST');
    expect(err instanceof AppError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

describe('ConflictError', () => {
  it('tiene statusCode 409 y code CONFLICT', () => {
    const err = new ConflictError('Ya existe un registro');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('Ya existe un registro');
  });

  it('es instancia de AppError', () => {
    expect(new ConflictError('test') instanceof AppError).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('tiene statusCode 404 y code NOT_FOUND', () => {
    const err = new NotFoundError('Empresa');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Empresa no encontrado');
  });

  it('usa nombre de recurso por defecto cuando se omite', () => {
    const err = new NotFoundError();
    expect(err.message).toBe('Recurso no encontrado');
  });

  it('es instancia de AppError', () => {
    expect(new NotFoundError('Test') instanceof AppError).toBe(true);
  });
});

describe('UnauthorizedError', () => {
  it('tiene statusCode 401 y code UNAUTHORIZED', () => {
    const err = new UnauthorizedError('Token requerido');
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Token requerido');
  });

  it('usa mensaje por defecto cuando se omite', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('No autorizado');
  });

  it('es instancia de AppError', () => {
    expect(new UnauthorizedError() instanceof AppError).toBe(true);
  });
});
