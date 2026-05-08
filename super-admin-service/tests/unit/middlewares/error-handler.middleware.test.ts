import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../../../src/middlewares/error-handler.middleware';
import { AppError } from '../../../src/shared/errors/app-error';
import { ConflictError } from '../../../src/shared/errors/conflict.error';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, _json: json } as unknown as Response & { _json: typeof json };
}

const req = {} as Request;
const next = vi.fn() as unknown as NextFunction;

describe('errorHandler', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('responde con statusCode y code de AppError', () => {
    const res = makeRes();
    const err = new AppError('Recurso no encontrado', 404, 'NOT_FOUND');

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Recurso no encontrado',
        error: expect.objectContaining({ code: 'NOT_FOUND' }),
      }),
    );
  });

  it('maneja ConflictError correctamente', () => {
    const res = makeRes();
    const err = new ConflictError('Ya existe');

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res._json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('maneja NotFoundError correctamente', () => {
    const res = makeRes();
    const err = new NotFoundError('Empresa');

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('responde 500 para errores no controlados', () => {
    const res = makeRes();
    const err = new Error('error inesperado');
    process.env['NODE_ENV'] = 'production';

    errorHandler(err, req, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Internal Server Error',
        error: expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR', details: null }),
      }),
    );
    process.env['NODE_ENV'] = 'test';
  });

  it('expone detalles del error en modo desarrollo', () => {
    const res = makeRes();
    const err = new Error('mensaje interno');
    process.env['NODE_ENV'] = 'development';

    errorHandler(err, req, res as unknown as Response, next);

    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ details: 'mensaje interno' }),
      }),
    );
    process.env['NODE_ENV'] = 'test';
  });

  it('incluye details de AppError cuando se proveen', () => {
    const res = makeRes();
    const details = [{ field: 'nombre', message: 'requerido' }];
    const err = new AppError('Inválido', 400, 'VALIDATION_ERROR', details);

    errorHandler(err, req, res as unknown as Response, next);

    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ details }),
      }),
    );
  });
});

describe('notFoundHandler', () => {
  it('responde 404 con mensaje de ruta no encontrada', () => {
    const res = makeRes();

    notFoundHandler(req, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res._json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Ruta no encontrada' }),
    );
  });
});
