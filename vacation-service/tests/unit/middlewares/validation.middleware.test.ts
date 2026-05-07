import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateRequest } from '../../../src/middlewares/validation.middleware';

const schema = z.object({
  name: z.string().min(1),
  age:  z.number().int().positive(),
});

function makeReqWith(body: unknown): Request {
  return { body } as Request;
}

describe('validateRequest', () => {
  const res = {} as Response;

  it('passes validated body to req.body and calls next() without args', () => {
    const req  = makeReqWith({ name: 'Ana', age: 30 });
    const next = vi.fn() as unknown as NextFunction;
    validateRequest(schema)(req, res, next);
    expect(req.body).toEqual({ name: 'Ana', age: 30 });
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with BadRequestError on invalid body', () => {
    const req  = makeReqWith({ name: '', age: -1 });
    const next = vi.fn() as unknown as NextFunction;
    validateRequest(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, code: 'BAD_REQUEST_ERROR' }),
    );
  });

  it('calls next with BadRequestError when required fields are missing', () => {
    const req  = makeReqWith({});
    const next = vi.fn() as unknown as NextFunction;
    validateRequest(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

