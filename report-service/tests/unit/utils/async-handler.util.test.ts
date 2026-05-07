import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../src/utils/async-handler.util';

const req = {} as Request;
const res = {} as Response;

describe('asyncHandler', () => {
  it('calls the wrapped handler with req, res, and next', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn();

    asyncHandler(fn)(req, res, next);
    await new Promise(resolve => process.nextTick(resolve));

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('calls next with the rejection reason when the handler throws', async () => {
    const error = new Error('async failure');
    const fn    = vi.fn().mockRejectedValue(error);
    const next  = vi.fn();

    asyncHandler(fn)(req, res, next);
    await new Promise(resolve => process.nextTick(resolve));

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next when the handler resolves successfully', async () => {
    const fn   = vi.fn().mockResolvedValue(undefined);
    const next = vi.fn();

    asyncHandler(fn)(req, res, next);
    await new Promise(resolve => process.nextTick(resolve));

    expect(next).not.toHaveBeenCalled();
  });

  it('returns void synchronously (does not return a promise)', () => {
    const fn     = vi.fn().mockResolvedValue(undefined);
    const result = asyncHandler(fn)(req, res, vi.fn());

    expect(result).toBeUndefined();
  });
});
