import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { ReportController } from '../../../src/controller/report.controller';
import { ReportService } from '../../../src/services/report.service';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';
import { AppError } from '../../../src/shared/errors/app-error';

vi.mock('../../../src/clients/historyClient', () => ({
  registrarAccion: vi.fn(),
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    params: {},
    query: {},
    body: {},
    headers: { authorization: 'Bearer test-token' },
    ip: '127.0.0.1',
    user: { id: '1', email: 'admin@empresa.com', rol: 'ADMIN' },
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

function makeRes(): vi.Mocked<Response> {
  const r = {} as vi.Mocked<Response>;
  r.status    = vi.fn().mockReturnValue(r);
  r.json      = vi.fn().mockReturnValue(r);
  r.setHeader = vi.fn().mockReturnValue(r);
  r.send      = vi.fn().mockReturnValue(r);
  return r;
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('ReportController', () => {
  let controller: ReportController;
  let service: vi.Mocked<ReportService>;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    service = {
      getReporteEmpleado:   vi.fn(),
      getEstadoLaboral:     vi.fn(),
      getReporteVacaciones: vi.fn(),
      getReporteContratos:  vi.fn(),
      getReporteTurnover:   vi.fn(),
      getEmpleadosCsv:      vi.fn(),
    } as unknown as vi.Mocked<ReportService>;
    controller = new ReportController(service);
  });

  // ── getReporteEmpleado ────────────────────────────────────────────────────

  describe('getReporteEmpleado', () => {
    it('calls service with parsed id and token, returns 200', async () => {
      const data = { empleado: { id: 1 }, advertencias: [] };
      service.getReporteEmpleado.mockResolvedValue(data as never);
      const res = makeRes();

      await controller.getReporteEmpleado(makeReq({ params: { id: '1' } }), res, next);

      expect(service.getReporteEmpleado).toHaveBeenCalledWith(1, 'Bearer test-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data });
    });

    it('forwards errors to next via asyncHandler', async () => {
      const error = new AppError('Not found', 404, 'NOT_FOUND');
      service.getReporteEmpleado.mockRejectedValue(error);
      const res = makeRes();

      controller.getReporteEmpleado(makeReq({ params: { id: '99' } }), res, next);
      await new Promise(resolve => process.nextTick(resolve));

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  // ── getEstadoLaboral ──────────────────────────────────────────────────────

  describe('getEstadoLaboral', () => {
    it('calls service and returns 200 with data', async () => {
      const data = { empleados: [], total: 0, advertencias: [], generado_en: '' };
      service.getEstadoLaboral.mockResolvedValue(data);
      const res = makeRes();

      await controller.getEstadoLaboral(makeReq(), res, next);

      expect(service.getEstadoLaboral).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data });
    });

    it('forwards errors to next via asyncHandler', async () => {
      service.getEstadoLaboral.mockRejectedValue(new Error('Service error'));
      const res = makeRes();

      controller.getEstadoLaboral(makeReq(), res, next);
      await new Promise(resolve => process.nextTick(resolve));

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── getReporteVacaciones ──────────────────────────────────────────────────

  describe('getReporteVacaciones', () => {
    it('passes query filters to service when params are present', async () => {
      service.getReporteVacaciones.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const res = makeRes();
      const req = makeReq({ query: { empleado_id: '7', desde: '2024-01-01', hasta: '2024-12-31', estado: 'aprobada' } });

      await controller.getReporteVacaciones(req, res, next);

      expect(service.getReporteVacaciones).toHaveBeenCalledWith(
        'Bearer test-token',
        { empleado_id: '7', desde: '2024-01-01', hasta: '2024-12-31', estado: 'aprobada' },
      );
    });

    it('passes empty params when no query params', async () => {
      service.getReporteVacaciones.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const response = makeRes();

      await controller.getReporteVacaciones(makeReq(), response, next);

      expect(service.getReporteVacaciones).toHaveBeenCalledWith('Bearer test-token', {});
      expect(response.status).toHaveBeenCalledWith(200);
    });
  });

  // ── getReporteContratos ───────────────────────────────────────────────────

  describe('getReporteContratos', () => {
    it('calls service and returns 200 without query params', async () => {
      service.getReporteContratos.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const res = makeRes();

      await controller.getReporteContratos(makeReq(), res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('passes query filters (empleado_id, desde, hasta, estado) to service', async () => {
      service.getReporteContratos.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const req = makeReq({ query: { empleado_id: '7', desde: '2025-01-01', estado: 'activo' } });

      await controller.getReporteContratos(req, makeRes(), next);

      expect(service.getReporteContratos).toHaveBeenCalledWith(
        'Bearer test-token',
        { empleado_id: '7', desde: '2025-01-01', estado: 'activo' },
      );
    });

    it('passes query filters to service when params are present', async () => {
      service.getReporteContratos.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const response = makeRes();
      const request  = makeReq({ query: { desde: '2024-01-01', hasta: '2024-12-31', estado: 'activo' } });

      await controller.getReporteContratos(request, response, next);

      expect(service.getReporteContratos).toHaveBeenCalledWith(
        'Bearer test-token',
        { desde: '2024-01-01', hasta: '2024-12-31', estado: 'activo' },
      );
    });
  });

  describe('token extraction', () => {
    it('returns empty string when authorization header is absent', async () => {
      service.getEstadoLaboral.mockResolvedValue({ empleados: [], total: 0, advertencias: [], generado_en: '' });
      const response = makeRes();

      await controller.getEstadoLaboral(
        makeReq({ headers: {} }),
        response,
        next,
      );

      expect(service.getEstadoLaboral).toHaveBeenCalledWith('');
    });
  });

  // ── getReporteTurnover ────────────────────────────────────────────────────

  describe('getReporteTurnover', () => {
    it('passes date range to service', async () => {
      service.getReporteTurnover.mockResolvedValue({ data: [], total: 0, advertencias: [], generado_en: '' });
      const req = makeReq({ query: { desde: '2024-01-01', hasta: '2024-06-30' } });

      await controller.getReporteTurnover(req, makeRes(), next);

      expect(service.getReporteTurnover).toHaveBeenCalledWith('Bearer test-token', '2024-01-01', '2024-06-30');
    });

    it('passes undefined when query params are absent', async () => {
      service.getReporteTurnover.mockResolvedValue({ data: [], total: 0, advertencias: [], generado_en: '' });

      await controller.getReporteTurnover(makeReq(), makeRes(), next);

      expect(service.getReporteTurnover).toHaveBeenCalledWith('Bearer test-token', undefined, undefined);
    });
  });

  // ── getEmpleadosCsv ───────────────────────────────────────────────────────

  describe('getEmpleadosCsv', () => {
    it('sets CSV content headers and sends file with BOM', async () => {
      service.getEmpleadosCsv.mockResolvedValue('ID,Nombre\r\n1,Ana');
      const res = makeRes();

      await controller.getEmpleadosCsv(makeReq(), res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringMatching(/attachment; filename="empleados_\d{4}-\d{2}-\d{2}\.csv"/),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      const sentContent = (res.send as vi.Mock).mock.calls[0][0] as string;
      expect(sentContent).toMatch(/^﻿/); // BOM character
    });

    it('forwards errors to next via asyncHandler', async () => {
      service.getEmpleadosCsv.mockRejectedValue(new Error('upstream down'));

      controller.getEmpleadosCsv(makeReq(), makeRes(), next);
      await new Promise(resolve => process.nextTick(resolve));

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
