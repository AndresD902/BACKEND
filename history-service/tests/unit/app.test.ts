import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { AppError } from '../../src/shared/errors/app-error';

// ── Hoisted mocks (dev / test scenario) ───────────────────────────────────────

const devMockMorgan = vi.hoisted(() =>
  vi.fn((_format: string) => (_req: any, _res: any, next: any) => next()),
);

const stubApiRouter = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const r = express.Router();
  r.get('/ping', (_req: any, res: any) => res.status(200).json({ ok: true }));
  r.post('/echo', (req: any, res: any) => res.status(200).json(req.body));
  // AppError is referenced inside the function body — resolved at call time, not definition time
  r.get('/trigger-app-error', (_req: any, _res: any, next: any) =>
    next(new AppError('Test error', 422, 'TEST_ERROR')),
  );
  r.get('/trigger-error', (_req: any, _res: any, next: any) =>
    next(new Error('Unexpected failure')),
  );
  return r;
});

const stubHealthRouter = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const express = require('express');
  const r = express.Router();
  r.get('/', (_req: any, res: any) => res.status(200).json({ status: 'ok' }));
  return r;
});

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('morgan', () => ({ default: devMockMorgan }));

vi.mock('../../src/config/env', () => ({
  env: {
    nodeEnv: 'test',
    corsOrigins: ['http://localhost:5173'],
    serviceName: 'history-service',
    jwtSecret: 'test-secret-key-for-history-service-32chars!!',
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    internalApiKey: 'test-internal-api-key',
    port: 3006,
  },
}));

vi.mock('../../src/routes', () => ({ default: stubApiRouter }));
vi.mock('../../src/routes/health.routes', () => ({ default: stubHealthRouter }));

import app from '../../src/app';

// ── Dev / test mode tests ─────────────────────────────────────────────────────

describe('app', () => {
  // ── Helmet ──────────────────────────────────────────────────────────────────

  describe('Helmet security headers', () => {
    it('sets x-dns-prefetch-control header', async () => {
      const res = await request(app).get('/api/ping');
      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    });

    it('sets x-frame-options header', async () => {
      const res = await request(app).get('/api/ping');
      expect(res.headers['x-frame-options']).toBeDefined();
    });

    it('sets x-content-type-options to nosniff', async () => {
      const res = await request(app).get('/api/ping');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  // ── CORS ────────────────────────────────────────────────────────────────────

  describe('CORS', () => {
    it('allows requests from an allowed origin', async () => {
      const res = await request(app)
        .get('/api/ping')
        .set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('sets credentials header for an allowed origin', async () => {
      const res = await request(app)
        .get('/api/ping')
        .set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not set CORS header for a blocked origin', async () => {
      const res = await request(app)
        .get('/api/ping')
        .set('Origin', 'http://evil.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  // ── Morgan format ────────────────────────────────────────────────────────────

  describe('morgan logging format', () => {
    it('uses dev format in non-production environment', () => {
      expect(devMockMorgan).toHaveBeenCalledWith('dev');
    });

    it('does not use combined format in non-production environment', () => {
      expect(devMockMorgan).not.toHaveBeenCalledWith('combined');
    });
  });

  // ── Body parsing ─────────────────────────────────────────────────────────────

  describe('JSON body parsing', () => {
    it('parses a JSON body and echoes it back', async () => {
      const res = await request(app)
        .post('/api/echo')
        .send({ name: 'test' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('test');
    });

    it('rejects a body larger than 10 kb', async () => {
      const big = 'x'.repeat(11 * 1024);
      const res = await request(app)
        .post('/api/echo')
        .send(JSON.stringify({ data: big }))
        .set('Content-Type', 'application/json');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── Route mounting ───────────────────────────────────────────────────────────

  describe('route mounting', () => {
    it('mounts health routes at /health', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('mounts API routes at /api', async () => {
      const res = await request(app).get('/api/ping');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  // ── Not-found middleware ──────────────────────────────────────────────────────

  describe('not-found middleware', () => {
    it('returns 404 for an unknown route', async () => {
      const res = await request(app).get('/unknown/path');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 for an unknown API path', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── Error handler ─────────────────────────────────────────────────────────────

  describe('error handler', () => {
    it('returns AppError statusCode and code for known application errors', async () => {
      const res = await request(app).get('/api/trigger-app-error');
      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('TEST_ERROR');
      expect(res.body.error.message).toBe('Test error');
    });

    it('returns 500 with INTERNAL_ERROR code for unhandled errors', async () => {
      const res = await request(app).get('/api/trigger-error');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});

// ── Production mode (fresh module load via resetModules + dynamic import) ──────

describe('app (production mode)', () => {
  let prodApp: Express;
  const prodMockMorgan = vi.fn((_format: string) => (_req: any, _res: any, next: any) => next());

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock('morgan', () => ({ default: prodMockMorgan }));
    vi.doMock('../../src/config/env', () => ({
      env: {
        nodeEnv: 'production',
        corsOrigins: ['https://hr.empresa.com'],
        serviceName: 'history-service',
        jwtSecret: 'prod-secret-key-for-history-service-32chars!!',
        databaseUrl: 'postgresql://prod:prod@db:5432/history_db',
        internalApiKey: 'prod-internal-api-key',
        port: 3006,
      },
    }));
    vi.doMock('../../src/routes', () => ({ default: stubApiRouter }));
    vi.doMock('../../src/routes/health.routes', () => ({ default: stubHealthRouter }));

    const mod = await import('../../src/app');
    prodApp = mod.default as Express;
  });

  afterAll(() => {
    vi.resetModules();
  });

  it('uses combined format in production environment', () => {
    expect(prodMockMorgan).toHaveBeenCalledWith('combined');
  });

  it('does not use dev format in production environment', () => {
    expect(prodMockMorgan).not.toHaveBeenCalledWith('dev');
  });

  it('still responds to requests correctly in production mode', async () => {
    const res = await request(prodApp).get('/health');
    expect(res.status).toBe(200);
  });
});
