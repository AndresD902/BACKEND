import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../../../src/middlewares/error-handler.middleware';
import { AppError } from '../../../src/shared/errors/app-error';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRes(): vi.Mocked<Response> {
  const r = {} as vi.Mocked<Response>;
  r.status = vi.fn().mockReturnValue(r);
  r.json   = vi.fn().mockReturnValue(r);
  return r;
}

const req  = {} as Request;
const next = vi.fn() as NextFunction;

// ─── errorHandler ─────────────────────────────────────────────────────────────

describe('errorHandler', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('uses AppError.statusCode and returns the structured error body', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    const res = makeRes();
    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Not found',
      error: { code: 'NOT_FOUND', details: null },
    });
  });

  it('includes details when AppError carries them', () => {
    const err = new AppError('Validation failed', 400, 'VALIDATION_ERROR', { field: 'email' });
    const res = makeRes();
    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'VALIDATION_ERROR', details: { field: 'email' } },
    }));
  });

  it('returns 500 INTERNAL_SERVER_ERROR for unknown errors', () => {
    const res = makeRes();
    errorHandler(new Error('boom'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Internal Server Error',
      error: expect.objectContaining({ code: 'INTERNAL_SERVER_ERROR' }),
    }));
  });

  it('writes to stderr for unknown errors', () => {
    errorHandler(new Error('crash'), req, makeRes(), next);
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('exposes error message in details when NODE_ENV is development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = makeRes();

    errorHandler(new Error('secret detail'), req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ details: 'secret detail' }),
    }));
    process.env.NODE_ENV = originalEnv;
  });

  it('hides error message in details when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const res = makeRes();

    errorHandler(new Error('secret'), req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ details: null }),
    }));
    process.env.NODE_ENV = originalEnv;
  });
});

// ─── notFoundHandler ──────────────────────────────────────────────────────────

describe('notFoundHandler', () => {
  it('returns 404 with the expected body', () => {
    const res = makeRes();
    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Ruta no encontrada',
    });
  });
});
