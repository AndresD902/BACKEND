import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middlewares/error-handler.middleware';
import { AppError } from '../../../src/shared/errors/app-error';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { ConflictError } from '../../../src/shared/errors/conflict.error';

function makeRes(): jest.Mocked<Response> {
  const res = {} as jest.Mocked<Response>;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = jest.fn() as unknown as NextFunction;

describe('errorHandler middleware', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles NotFoundError with 404', () => {
    const res = makeRes();
    errorHandler(new NotFoundError('not found'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'not found',
        error: expect.objectContaining({
          code: 'NOT_FOUND_ERROR',
        }),
      })
    );
  });

  it('handles ConflictError with 409 and null details', () => {
    const res = makeRes();

    errorHandler(new ConflictError('conflict'), req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);

    const body = (res.json as jest.Mock).mock.calls[0][0];

    expect(body.error.details).toBeNull();
  });

  it('handles AppError with details', () => {
    const res = makeRes();

    errorHandler(
      new AppError('bad', 400, 'BAD', { f: 1 }),
      req,
      res,
      next
    );

    const body = (res.json as jest.Mock).mock.calls[0][0];

    expect(body.error.details).toEqual({ f: 1 });
  });

  it('handles generic Error as 500 in development (shows message)', () => {
    process.env.NODE_ENV = 'development';

    const res = makeRes();

    errorHandler(new Error('boom'), req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];

    expect(res.status).toHaveBeenCalledWith(500);
    expect(body.success).toBe(false);
    expect(body.error.details).toBe('boom');

    process.env.NODE_ENV = 'test';
  });

  it('hides error details in production', () => {
    process.env.NODE_ENV = 'production';

    const res = makeRes();

    errorHandler(new Error('secret db error'), req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];

    expect(body.error.details).toBeNull();

    process.env.NODE_ENV = 'test';
  });

  it('uses INTERNAL_SERVER_ERROR code for generic errors', () => {
    const res = makeRes();

    errorHandler(new Error('x'), req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];

    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('uses err.message when err.stack is undefined', () => {
    process.env.NODE_ENV = 'development';

    const err = new Error('no stack');

    delete err.stack;

    const res = makeRes();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);

    process.env.NODE_ENV = 'test';
  });
});