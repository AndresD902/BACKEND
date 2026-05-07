import { ReportService } from '../../../src/services/report.service';
import * as empClient from '../../../src/clients/employeeClient';
import * as conClient from '../../../src/clients/contractClient';
import * as vacClient from '../../../src/clients/vacationClient';

jest.mock('../../../src/clients/employeeClient');
jest.mock('../../../src/clients/contractClient');
jest.mock('../../../src/clients/vacationClient');

const TOKEN = 'Bearer test-token';

const mockEmp = { id: 1, nombre: 'Ana', apellido: 'García', estado: 'activo' };
const mockCargo = { id: 1, cargo: 'Dev', salario: 5000000 };
const mockContrato = { id: 1, tipo: 'indefinido' };
const mockVacacion = { id: 1, estado: 'aprobada' };
const mockDisponibles = { dias_disponibles: 10 };

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportService();
  });

  // ── getReporteEmpleado ──────────────────────────────────────────────────────

  describe('getReporteEmpleado', () => {
    it('returns consolidated data when all services respond', async () => {
      jest.mocked(empClient.getEmpleado).mockResolvedValue(mockEmp);
      jest.mocked(empClient.getHistorialCargo).mockResolvedValue([mockCargo]);
      jest.mocked(conClient.getContratosPorEmpleado).mockResolvedValue([mockContrato]);
      jest.mocked(vacClient.getVacacionesPorEmpleado).mockResolvedValue([mockVacacion]);
      jest.mocked(vacClient.getDiasDisponibles).mockResolvedValue(mockDisponibles);

      const result = await service.getReporteEmpleado(1, TOKEN);

      expect(result.empleado).toEqual(mockEmp);
      expect(result.historial_cargo).toEqual([mockCargo]);
      expect(result.contratos).toEqual([mockContrato]);
      expect(result.vacaciones).toEqual([mockVacacion]);
      expect(result.disponibles).toEqual(mockDisponibles);
      expect(result.advertencias).toHaveLength(0);
      expect(result.generado_en).toBeDefined();
    });

    it('returns partial data with warnings when one service fails', async () => {
      jest.mocked(empClient.getEmpleado).mockResolvedValue(mockEmp);
      jest.mocked(empClient.getHistorialCargo).mockResolvedValue([mockCargo]);
      jest.mocked(conClient.getContratosPorEmpleado).mockRejectedValue(new Error('Contract service down'));
      jest.mocked(vacClient.getVacacionesPorEmpleado).mockResolvedValue([]);
      jest.mocked(vacClient.getDiasDisponibles).mockResolvedValue(null);

      const result = await service.getReporteEmpleado(1, TOKEN);

      expect(result.empleado).toEqual(mockEmp);
      expect(result.contratos).toBeNull();
      expect(result.advertencias).toHaveLength(1);
      expect(result.advertencias[0]).toContain('contratos');
    });

    it('returns all nulls with warnings when all services fail', async () => {
      jest.mocked(empClient.getEmpleado).mockRejectedValue(new Error('down'));
      jest.mocked(empClient.getHistorialCargo).mockRejectedValue(new Error('down'));
      jest.mocked(conClient.getContratosPorEmpleado).mockRejectedValue(new Error('down'));
      jest.mocked(vacClient.getVacacionesPorEmpleado).mockRejectedValue(new Error('down'));
      jest.mocked(vacClient.getDiasDisponibles).mockRejectedValue(new Error('down'));

      const result = await service.getReporteEmpleado(1, TOKEN);

      expect(result.empleado).toBeNull();
      expect(result.historial_cargo).toBeNull();
      expect(result.contratos).toBeNull();
      expect(result.vacaciones).toBeNull();
      expect(result.disponibles).toBeNull();
      expect(result.advertencias).toHaveLength(5);
    });

    it('uses rejection reason directly when it has no message property', async () => {
      jest.mocked(empClient.getEmpleado).mockResolvedValue(mockEmp);
      jest.mocked(empClient.getHistorialCargo).mockResolvedValue([]);
      jest.mocked(conClient.getContratosPorEmpleado).mockRejectedValue('string-error-reason');
      jest.mocked(vacClient.getVacacionesPorEmpleado).mockResolvedValue([]);
      jest.mocked(vacClient.getDiasDisponibles).mockResolvedValue(null);

      const result = await service.getReporteEmpleado(1, TOKEN);

      expect(result.contratos).toBeNull();
      expect(result.advertencias[0]).toContain('string-error-reason');
    });
  });

  // ── getEstadoLaboral ────────────────────────────────────────────────────────

  describe('getEstadoLaboral', () => {
    it('returns enriched list for active employees', async () => {
      jest.mocked(empClient.getEmpleados).mockResolvedValue([mockEmp]);
      jest.mocked(empClient.getCargoActual).mockResolvedValue(mockCargo);
      jest.mocked(vacClient.getDiasDisponibles).mockResolvedValue(mockDisponibles);

      const result = await service.getEstadoLaboral(TOKEN);

      expect(result.total).toBe(1);
      expect(result.empleados[0].empleado).toEqual(mockEmp);
      expect(result.empleados[0].cargo_actual).toEqual(mockCargo);
      expect(result.advertencias).toHaveLength(0);
    });

    it('returns empty list with warning when employee service fails', async () => {
      jest.mocked(empClient.getEmpleados).mockRejectedValue(new Error('Employee service down'));

      const result = await service.getEstadoLaboral(TOKEN);

      expect(result.empleados).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.advertencias).toHaveLength(1);
    });

    it('handles failed enrichment for individual employees gracefully', async () => {
      jest.mocked(empClient.getEmpleados).mockResolvedValue([mockEmp]);
      jest.mocked(empClient.getCargoActual).mockRejectedValue(new Error('cargo not found'));
      jest.mocked(vacClient.getDiasDisponibles).mockRejectedValue(new Error('vac not found'));

      const result = await service.getEstadoLaboral(TOKEN);

      expect(result.total).toBe(1);
      expect(result.empleados[0].cargo_actual).toBeNull();
      expect(result.empleados[0].disponibles).toBeNull();
    });
  });

  // ── getReporteVacaciones ───────────────────────────────────────────────────

  describe('getReporteVacaciones', () => {
    it('returns vacation list', async () => {
      jest.mocked(vacClient.getAllVacaciones).mockResolvedValue([mockVacacion]);

      const result = await service.getReporteVacaciones(TOKEN);

      expect(result.data).toEqual([mockVacacion]);
      expect(result.advertencias).toHaveLength(0);
    });

    it('returns empty with warning when vacation service fails', async () => {
      jest.mocked(vacClient.getAllVacaciones).mockRejectedValue(new Error('down'));

      const result = await service.getReporteVacaciones(TOKEN);

      expect(result.data).toHaveLength(0);
      expect(result.advertencias).toHaveLength(1);
    });
  });

  // ── getReporteContratos ────────────────────────────────────────────────────

  describe('getReporteContratos', () => {
    it('returns contract list', async () => {
      jest.mocked(conClient.getAllContratos).mockResolvedValue([mockContrato]);

      const result = await service.getReporteContratos(TOKEN);

      expect(result.data).toEqual([mockContrato]);
      expect(result.advertencias).toHaveLength(0);
    });

    it('returns empty with warning when contract service fails', async () => {
      jest.mocked(conClient.getAllContratos).mockRejectedValue(new Error('down'));

      const result = await service.getReporteContratos(TOKEN);

      expect(result.data).toHaveLength(0);
      expect(result.advertencias).toHaveLength(1);
    });
  });

  // ── getReporteTurnover ─────────────────────────────────────────────────────

  describe('getReporteTurnover', () => {
    it('returns retired employees', async () => {
      const retired = { ...mockEmp, estado: 'retirado' };
      jest.mocked(empClient.getEmpleados).mockResolvedValue([retired]);

      const result = await service.getReporteTurnover(TOKEN, '2024-01-01', '2024-12-31');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.advertencias).toHaveLength(0);
    });

    it('returns empty with warning when employee service fails', async () => {
      jest.mocked(empClient.getEmpleados).mockRejectedValue(new Error('down'));

      const result = await service.getReporteTurnover(TOKEN);

      expect(result.data).toHaveLength(0);
      expect(result.advertencias).toHaveLength(1);
    });
  });

  // ── getEmpleadosCsv ───────────────────────────────────────────────────────

  describe('getEmpleadosCsv', () => {
    it('returns CSV string with headers and data', async () => {
      jest.mocked(empClient.getAllEmpleados).mockResolvedValue([mockEmp]);

      const csv = await service.getEmpleadosCsv(TOKEN);

      expect(typeof csv).toBe('string');
      expect(csv).toContain('Nombre');
      expect(csv).toContain('Ana');
    });

    it('returns only headers when no employees exist', async () => {
      jest.mocked(empClient.getAllEmpleados).mockResolvedValue([]);

      const csv = await service.getEmpleadosCsv(TOKEN);

      expect(csv).toContain('ID');
      expect(csv).toContain('Cédula');
      expect(csv.split('\r\n')).toHaveLength(1);
    });
  });
});
