import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireQueryParams } from '../../../src/middlewares/validation.middleware';
import { AppError } from '../../../src/shared/errors/app-error';

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request;
}

const res = {} as Response;

// ─── requireQueryParams ───────────────────────────────────────────────────────

describe('requireQueryParams', () => {
  it('calls next without an error when all required params are present', () => {
    const next = vi.fn() as NextFunction;
    requireQueryParams('desde', 'hasta')(
      buildReq({ desde: '2024-01-01', hasta: '2024-12-31' }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(/* no args */);
  });

  it('calls next with a 400 AppError when a single required param is missing', () => {
    const next = vi.fn() as NextFunction;
    requireQueryParams('desde', 'hasta')(
      buildReq({ desde: '2024-01-01' }), // 'hasta' is missing
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as vi.Mock).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('MISSING_QUERY_PARAMS');
    expect(err.message).toContain('hasta');
  });

  it('lists all missing params in the error message', () => {
    const next = vi.fn() as NextFunction;
    requireQueryParams('desde', 'hasta')(buildReq({}), res, next);

    const err = (next as vi.Mock).mock.calls[0][0] as AppError;
    expect(err.message).toContain('desde');
    expect(err.message).toContain('hasta');
  });

  it('calls next without error when no params are required', () => {
    const next = vi.fn() as NextFunction;
    requireQueryParams()(buildReq({}), res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it('treats an empty-string query param as missing', () => {
    const next = vi.fn() as NextFunction;
    requireQueryParams('desde')(buildReq({ desde: '' }), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
  });
});
