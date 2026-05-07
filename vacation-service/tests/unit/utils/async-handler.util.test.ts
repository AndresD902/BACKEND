import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../src/utils/async-handler.util';

describe('asyncHandler', () => {
  const req = {} as Request;
  const res = {} as Response;

  it('calls the handler with req, res, and next', async () => {
    const fn   = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn() as unknown as NextFunction;
    asyncHandler(fn)(req, res, next);
    await new Promise(r => setImmediate(r));
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('passes the error to next when the handler rejects', async () => {
    const error = new Error('async error');
    const fn    = vi.fn().mockRejectedValue(error);
    const next  = vi.fn() as unknown as NextFunction;
    asyncHandler(fn)(req, res, next);
    await new Promise(r => setImmediate(r));
    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next when the handler resolves successfully', async () => {
    const fn   = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn() as unknown as NextFunction;
    asyncHandler(fn)(req, res, next);
    await new Promise(r => setImmediate(r));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns void synchronously', () => {
    const fn     = vi.fn().mockResolvedValue(undefined);
    const next   = vi.fn() as unknown as NextFunction;
    const result = asyncHandler(fn)(req, res, next);
    expect(result).toBeUndefined();
  });
});
