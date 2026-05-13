import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../../../src/middlewares/error-handler.middleware';
import { AppError } from '../../../src/shared/errors/app-error';
import { UnauthorizedError } from '../../../src/shared/errors/unauthorized.error';
import { ForbiddenError } from '../../../src/shared/errors/forbidden.error';

function mockRes() {
  const r = { status: vi.fn(), json: vi.fn() } as any;
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  return r;
}

const next = vi.fn();

beforeEach(() => vi.clearAllMocks());

describe('errorHandler', () => {
  it('returns statusCode and structured body for AppError instances', () => {
    const err = new AppError('algo falló', 422, 'UNPROCESSABLE');
    const res = mockRes();

    errorHandler(err, {} as any, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNPROCESSABLE', message: 'algo falló' },
    });
  });

  it('handles UnauthorizedError (AppError subclass) with 401', () => {
    const err = new UnauthorizedError('Token requerido');
    const res = mockRes();

    errorHandler(err, {} as any, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token requerido' },
    });
  });

  it('handles ForbiddenError (AppError subclass) with 403', () => {
    const err = new ForbiddenError('Sin permisos');
    const res = mockRes();

    errorHandler(err, {} as any, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Sin permisos' },
    });
  });

  it('returns 500 with INTERNAL_ERROR for non-AppError exceptions', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('unexpected DB crash');
    const res = mockRes();

    errorHandler(err, {} as any, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    consoleSpy.mockRestore();
  });

  it('logs the unhandled error to console.error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('crash');
    const res = mockRes();

    errorHandler(err, {} as any, res, next);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
