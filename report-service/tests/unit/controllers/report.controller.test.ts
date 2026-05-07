import { Response } from 'express';
import { ReportController } from '../../../src/controller/report.controller';
import { ReportService } from '../../../src/services/report.service';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

jest.mock('../../../src/clients/historyClient', () => ({
  registrarAccion: jest.fn(),
}));

function req(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
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

function mockRes(): jest.Mocked<Response> {
  const r = {} as jest.Mocked<Response>;
  r.status = jest.fn().mockReturnValue(r);
  r.json   = jest.fn().mockReturnValue(r);
  r.setHeader = jest.fn().mockReturnValue(r);
  r.send   = jest.fn().mockReturnValue(r);
  return r;
}

const next = jest.fn();

describe('ReportController', () => {
  let controller: ReportController;
  let service: jest.Mocked<ReportService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = {
      getReporteEmpleado:    jest.fn(),
      getEstadoLaboral:      jest.fn(),
      getReporteVacaciones:  jest.fn(),
      getReporteContratos:   jest.fn(),
      getReporteTurnover:    jest.fn(),
      getEmpleadosCsv:       jest.fn(),
    } as unknown as jest.Mocked<ReportService>;
    controller = new ReportController(service);
  });

  describe('getReporteEmpleado', () => {
    it('calls service and returns 200', async () => {
      const data = { empleado: { id: 1 }, advertencias: [] };
      service.getReporteEmpleado.mockResolvedValue(data as never);
      const request  = req({ params: { id: '1' } });
      const response = mockRes();

      await controller.getReporteEmpleado(request, response, next);

      expect(service.getReporteEmpleado).toHaveBeenCalledWith(1, 'Bearer test-token');
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.json).toHaveBeenCalledWith({ success: true, data });
    });
  });

  describe('getEstadoLaboral', () => {
    it('calls service and returns 200', async () => {
      const data = { empleados: [], total: 0, advertencias: [], generado_en: '' };
      service.getEstadoLaboral.mockResolvedValue(data);
      const response = mockRes();

      await controller.getEstadoLaboral(req(), response, next);

      expect(service.getEstadoLaboral).toHaveBeenCalled();
      expect(response.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getReporteVacaciones', () => {
    it('passes query filters to service when params are present', async () => {
      service.getReporteVacaciones.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const response = mockRes();
      const request  = req({ query: { desde: '2024-01-01', hasta: '2024-12-31', estado: 'aprobada' } });

      await controller.getReporteVacaciones(request, response, next);

      expect(service.getReporteVacaciones).toHaveBeenCalledWith(
        'Bearer test-token',
        { desde: '2024-01-01', hasta: '2024-12-31', estado: 'aprobada' },
      );
    });

    it('passes empty params when no query params', async () => {
      service.getReporteVacaciones.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const response = mockRes();

      await controller.getReporteVacaciones(req(), response, next);

      expect(service.getReporteVacaciones).toHaveBeenCalledWith('Bearer test-token', {});
      expect(response.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getReporteContratos', () => {
    it('calls service and returns 200 without query params', async () => {
      service.getReporteContratos.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const response = mockRes();

      await controller.getReporteContratos(req(), response, next);

      expect(response.status).toHaveBeenCalledWith(200);
    });

    it('passes query filters to service when params are present', async () => {
      service.getReporteContratos.mockResolvedValue({ data: [], advertencias: [], generado_en: '' });
      const response = mockRes();
      const request  = req({ query: { desde: '2024-01-01', hasta: '2024-12-31', estado: 'activo' } });

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
      const response = mockRes();

      await controller.getEstadoLaboral(
        req({ headers: {} }),
        response,
        next,
      );

      expect(service.getEstadoLaboral).toHaveBeenCalledWith('');
    });
  });

  describe('getReporteTurnover', () => {
    it('passes date range to service', async () => {
      service.getReporteTurnover.mockResolvedValue({ data: [], total: 0, advertencias: [], generado_en: '' });
      const response = mockRes();
      const request  = req({ query: { desde: '2024-01-01', hasta: '2024-06-30' } });

      await controller.getReporteTurnover(request, response, next);

      expect(service.getReporteTurnover).toHaveBeenCalledWith(
        'Bearer test-token', '2024-01-01', '2024-06-30',
      );
    });

    it('passes undefined dates when query is empty', async () => {
      service.getReporteTurnover.mockResolvedValue({ data: [], total: 0, advertencias: [], generado_en: '' });
      const response = mockRes();

      await controller.getReporteTurnover(req(), response, next);

      expect(service.getReporteTurnover).toHaveBeenCalledWith(
        'Bearer test-token', undefined, undefined,
      );
    });
  });

  describe('getEmpleadosCsv', () => {
    it('sets CSV headers and returns file', async () => {
      service.getEmpleadosCsv.mockResolvedValue('ID,Nombre\r\n1,Ana');
      const response = mockRes();

      await controller.getEmpleadosCsv(req(), response, next);

      expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('empleados_'),
      );
      expect(response.status).toHaveBeenCalledWith(200);
      expect(response.send).toHaveBeenCalled();
    });
  });
});
