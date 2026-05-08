import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

vi.mock('../../../src/services/auditoria.service', () => ({
  auditoriaService: {
    obtenerAcciones: vi.fn(),
    obtenerCambios: vi.fn(),
  },
}));

import { auditoriaService } from '../../../src/services/auditoria.service';
import { AuditoriaController } from '../../../src/controller/auditoria.controller';

const mockAuditoriaService = vi.mocked(auditoriaService);

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, _json: json } as unknown as Response & { _json: typeof json };
}

function makeReq(query: Record<string, string> = {}, token = 'Bearer test-token'): AuthenticatedRequest {
  return {
    query,
    headers: { authorization: token },
    params: {},
    body: {},
  } as unknown as AuthenticatedRequest;
}

describe('AuditoriaController', () => {
  let ctrl: AuditoriaController;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ctrl = new AuditoriaController();
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('acciones', () => {
    it('retorna historial de acciones con status 200', async () => {
      const fakeResult = { data: [{ id: 1, accion: 'login' }], total: 1, advertencias: [], generado_en: new Date().toISOString() };
      mockAuditoriaService.obtenerAcciones.mockResolvedValue(fakeResult);
      const req = makeReq({ empresa: '1', accion: 'login', desde: '2025-01-01', hasta: '2025-12-31', email: 'a@b.com', page: '1', limit: '20' });
      const res = makeRes();

      ctrl.acciones(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockAuditoriaService.obtenerAcciones).toHaveBeenCalledWith(
        'Bearer test-token',
        expect.objectContaining({ empresa: '1', accion: 'login', desde: '2025-01-01', hasta: '2025-12-31', email: 'a@b.com', page: '1', limit: '20' }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json).toHaveBeenCalledWith({ success: true, data: fakeResult });
    });

    it('omite parámetros ausentes al construir params', async () => {
      mockAuditoriaService.obtenerAcciones.mockResolvedValue({ data: [], total: 0, advertencias: [], generado_en: '' });
      const req = makeReq({ empresa: '5' }); // solo empresa
      const res = makeRes();

      ctrl.acciones(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      const callParams = mockAuditoriaService.obtenerAcciones.mock.calls[0][1];
      expect(callParams).toEqual({ empresa: '5' });
      expect(callParams).not.toHaveProperty('accion');
    });

    it('pasa el error a next si el servicio lanza', async () => {
      mockAuditoriaService.obtenerAcciones.mockRejectedValue(new Error('fatal'));
      const req = makeReq();
      const res = makeRes();

      ctrl.acciones(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('cambios', () => {
    it('retorna historial de cambios con status 200', async () => {
      const fakeResult = { data: [{ id: 1, campo: 'salario' }], total: 1, advertencias: [], generado_en: new Date().toISOString() };
      mockAuditoriaService.obtenerCambios.mockResolvedValue(fakeResult);
      const req = makeReq({ empresa: '2', tipo: 'empleado', desde: '2025-01-01', hasta: '2025-06-30', email: 'x@y.com', page: '1', limit: '50' });
      const res = makeRes();

      ctrl.cambios(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockAuditoriaService.obtenerCambios).toHaveBeenCalledWith(
        'Bearer test-token',
        expect.objectContaining({ empresa: '2', tipo: 'empleado' }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json).toHaveBeenCalledWith({ success: true, data: fakeResult });
    });

    it('omite parámetros ausentes al construir params', async () => {
      mockAuditoriaService.obtenerCambios.mockResolvedValue({ data: [], total: 0, advertencias: [], generado_en: '' });
      const req = makeReq({}); // sin params
      const res = makeRes();

      ctrl.cambios(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      const callParams = mockAuditoriaService.obtenerCambios.mock.calls[0][1];
      expect(callParams).toEqual({});
    });

    it('pasa el error a next si el servicio lanza', async () => {
      mockAuditoriaService.obtenerCambios.mockRejectedValue(new Error('timeout'));
      const req = makeReq();
      const res = makeRes();

      ctrl.cambios(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
