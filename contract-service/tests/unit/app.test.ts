jest.mock('morgan', () => jest.fn(() => (_req: any, _res: any, next: any) => next()));

jest.mock('../../src/services/contract.service', () => ({
  contractService: {},
}));

jest.mock('../../src/config/env', () => ({
  env: {
    nodeEnv: 'test',
    corsOrigins: ['http://localhost:5173'],
    serviceName: 'contract-service',
  },
}));

import morgan from 'morgan';
import request from 'supertest';
import { app } from '../../src/app';

// ── morgan format branch (non-production) ─────────────────────────────────────

describe('app — morgan format', () => {
  it('calls morgan with dev format when nodeEnv is not production', () => {
    expect(jest.mocked(morgan)).toHaveBeenCalledWith('dev');
  });
});

// ── /health endpoint ──────────────────────────────────────────────────────────

describe('app — /health endpoint', () => {
  it('returns 200 with success and healthy status', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      service: 'contract-service',
      status: 'healthy',
    });
  });

  it('includes the service name from env in the response', async () => {
    const res = await request(app).get('/health');

    expect(res.body.service).toBe('contract-service');
  });
});

// ── middleware stack ──────────────────────────────────────────────────────────

describe('app — middleware stack', () => {
  it('adds Helmet security headers to every response', async () => {
    const res = await request(app).get('/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('allows requests from a configured CORS origin', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('does not include CORS header for an origin not in the allow-list', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://attacker.com');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows credentials in CORS preflight responses', async () => {
    const res = await request(app)
      .options('/health')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});

// ── route registration ────────────────────────────────────────────────────────

describe('app — route registration', () => {
  it('mounts contract routes under /contracts', async () => {
    const res = await request(app).get('/contracts');

    expect(res.status).not.toBe(404);
  });

  it('mounts contract routes under /api/contracts', async () => {
    const res = await request(app).get('/api/contracts');

    expect(res.status).not.toBe(404);
  });

  it('mounts contract routes under /api/contratos', async () => {
    const res = await request(app).get('/api/contratos');

    expect(res.status).not.toBe(404);
  });
});
