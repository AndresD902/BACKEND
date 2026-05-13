import { describe, it, expect, vi } from 'vitest';
import { notFoundMiddleware } from '../../../src/middlewares/not-found.middleware';

function mockRes() {
  const r = { status: vi.fn(), json: vi.fn() } as any;
  r.status.mockReturnValue(r);
  r.json.mockReturnValue(r);
  return r;
}

describe('notFoundMiddleware', () => {
  it('responds 404 with NOT_FOUND body', () => {
    const res = mockRes();

    notFoundMiddleware({} as any, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  it('always returns the same static body regardless of the request', () => {
    const res1 = mockRes();
    const res2 = mockRes();

    notFoundMiddleware({ url: '/foo' } as any, res1);
    notFoundMiddleware({ url: '/bar' } as any, res2);

    expect(res1.json.mock.calls[0][0]).toEqual(res2.json.mock.calls[0][0]);
  });
});
