import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../../../src/utils/async-handler.util';
import type { Request, Response, NextFunction } from 'express';

describe('asyncHandler', () => {
  it('invoca la función async con req, res y next', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    handler(req, res, next);
    await new Promise((r) => setImmediate(r));

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('redirige el error a next cuando la función lanza', async () => {
    const err = new Error('algo falló');
    const fn = vi.fn().mockRejectedValue(err);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    handler({} as Request, {} as Response, next);
    await new Promise((r) => setImmediate(r));

    expect(next).toHaveBeenCalledWith(err);
  });

  it('no llama a next cuando la función resuelve correctamente', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    const next = vi.fn();

    handler({} as Request, {} as Response, next);
    await new Promise((r) => setImmediate(r));

    expect(next).not.toHaveBeenCalled();
  });
});
