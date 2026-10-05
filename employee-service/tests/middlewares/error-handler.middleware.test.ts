import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middlewares/error-handler.middleware';
import { AppError } from '../../src/shared/errors/app-error';
import { NotFoundError } from '../../src/shared/errors/not-found.error';
import { ConflictError } from '../../src/shared/errors/conflict.error';

function buildRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const req = {} as Request;
const next = jest.fn() as unknown as NextFunction;

describe('errorHandler middleware', () => {
  it('should respond with AppError statusCode and code', () => {
    const err = new AppError('Resource not found', 404, 'NOT_FOUND');
    const res = buildRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'NOT_FOUND' }),
    }));
  });

  it('should handle NotFoundError (404)', () => {
    const err = new NotFoundError('Employee not found');
    const res = buildRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should handle ConflictError (409)', () => {
    const err = new ConflictError('Cedula already in use');
    const res = buildRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('should respond with 500 for generic errors', () => {
    const err = new Error('Unexpected failure');
    const res = buildRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'INTERNAL_SERVER_ERROR', details: null },
    }));
  });

  it('should include details: null when AppError has no details', () => {
    const err = new AppError('Bad request', 400, 'BAD_REQUEST');
    const res = buildRes();
    errorHandler(err, req, res, next);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: { code: 'BAD_REQUEST', details: null },
    }));
  });
});
