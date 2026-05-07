import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middlewares/error-handler.middleware';
import { BadRequestError } from '../../../src/shared/errors/bad-request.error';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json: jest.fn(), _status: status, _json: json } as unknown as Response & {
    _status: jest.Mock;
    _json: jest.Mock;
  };
}

describe('errorHandler', () => {
  const req  = {} as Request;
  const next = jest.fn() as unknown as NextFunction;

  it('returns the AppError status code and code for known errors', () => {
    const res = makeRes();
    const err = new BadRequestError('bad input', { field: 'x' });
    errorHandler(err, req, res, next);
    expect((res as unknown as { _status: jest.Mock })._status).toHaveBeenCalledWith(400);
    expect((res as unknown as { _json: jest.Mock })._json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'bad input',
        error: expect.objectContaining({ code: 'BAD_REQUEST_ERROR' }),
      }),
    );
  });

  it('returns 404 for NotFoundError', () => {
    const res = makeRes();
    errorHandler(new NotFoundError('not here'), req, res, next);
    expect((res as unknown as { _status: jest.Mock })._status).toHaveBeenCalledWith(404);
  });

  it('returns 500 for unknown errors', () => {
    const res = makeRes();
    errorHandler(new Error('boom'), req, res, next);
    expect((res as unknown as { _status: jest.Mock })._status).toHaveBeenCalledWith(500);
    expect((res as unknown as { _json: jest.Mock })._json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal Server Error' }),
    );
  });
});
