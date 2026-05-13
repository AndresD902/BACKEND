jest.mock('../src/config/env', () => ({
  env: {
    corsOrigins: ['http://localhost:5173'],
    nodeEnv: 'test',
  },
}));

jest.mock('../src/routes', () => {
  const express = require('express');
  const router = express.Router();

  router.get('/ping', (_req: any, res: any) => {
    res.status(200).json({ message: 'pong' });
  });

  router.post('/echo', (req: any, res: any) => {
    res.status(200).json(req.body);
  });

  router.get('/trigger-app-error', (_req: any, _res: any, next: any) => {
    const { AppError } = require('../src/shared/errors/app-error');
    next(new AppError('Something went wrong', 422, 'UNPROCESSABLE_ENTITY'));
  });

  router.get('/trigger-unknown-error', (_req: any, _res: any, next: any) => {
    next(new Error('Unexpected crash'));
  });

  return { __esModule: true, default: router };
});

jest.mock('../src/utils/logger.util', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import request from 'supertest';
import app from '../src/app';

describe('app — middleware stack', () => {
  it('agrega encabezados de seguridad de Helmet', async () => {
    const res = await request(app).get('/api/v1/ping');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('responde con el encabezado CORS para el origen permitido', async () => {
    const res = await request(app)
      .get('/api/v1/ping')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('no incluye el encabezado CORS para un origen no permitido', async () => {
    const res = await request(app)
      .get('/api/v1/ping')
      .set('Origin', 'http://evil.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('parsea el cuerpo JSON correctamente', async () => {
    const body = { nombre: 'Juan', edad: 30 };
    const res = await request(app)
      .post('/api/v1/echo')
      .send(body)
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(body);
  });

  it('rechaza cuerpos JSON que superen el límite de 10kb', async () => {
    // El errorHandler personalizado captura el error de Express y responde 500
    // porque no es una instancia de AppError. El límite de 10kb sí se aplica.
    const oversized = { data: 'x'.repeat(11 * 1024) };
    const res = await request(app)
      .post('/api/v1/echo')
      .send(oversized)
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('acepta credentials en la respuesta CORS (credentials: true)', async () => {
    const res = await request(app)
      .options('/api/v1/ping')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});

describe('app — rutas registradas en /api/v1', () => {
  it('responde 200 en /api/v1/ping', async () => {
    const res = await request(app).get('/api/v1/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'pong' });
  });
});

describe('app — manejo de errores (errorHandler)', () => {
  it('devuelve el statusCode y código del AppError cuando se lanza uno', async () => {
    const res = await request(app).get('/api/v1/trigger-app-error');
    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      success: false,
      message: 'Something went wrong',
      error: {
        code: 'UNPROCESSABLE_ENTITY',
        details: null,
      },
    });
  });

  it('devuelve 500 para errores no controlados', async () => {
    const res = await request(app).get('/api/v1/trigger-unknown-error');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Internal Server Error',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        details: null,
      },
    });
  });
});

describe('app — middleware 404 (notFoundMiddleware)', () => {
  it('devuelve 404 cuando la ruta no existe', async () => {
    const res = await request(app).get('/ruta-que-no-existe');
    expect(res.status).toBe(404);
  });

  it('el mensaje de error incluye el método y la URL solicitada', async () => {
    const res = await request(app).get('/api/v1/ruta-inexistente');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/GET/);
    expect(res.body.message).toMatch(/\/api\/v1\/ruta-inexistente/);
  });

  it('devuelve 404 para métodos no definidos en rutas existentes', async () => {
    const res = await request(app).delete('/api/v1/ping');
    expect(res.status).toBe(404);
  });
});
