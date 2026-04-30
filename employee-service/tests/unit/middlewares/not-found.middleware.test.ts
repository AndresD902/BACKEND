import { Request, Response, NextFunction } from 'express';
import { notFoundMiddleware } from '../../../src/middlewares/not-found.middleware';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';

describe('notFoundMiddleware', () => {
  it('calls next with NotFoundError including method and path', () => {
    const req = { method: 'GET', originalUrl: '/api/unknown' } as Request;
    const res = {} as Response;
    const next = jest.fn() as unknown as NextFunction;

    notFoundMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    const err = (next as jest.Mock).mock.calls[0][0] as NotFoundError;
    expect(err.message).toContain('GET');
    expect(err.message).toContain('/api/unknown');
    expect(err.statusCode).toBe(404);
  });
});
