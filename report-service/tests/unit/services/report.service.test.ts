import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../../../src/services/report.service';
import * as empClient from '../../../src/clients/employeeClient';
import * as conClient from '../../../src/clients/contractClient';
import * as vacClient from '../../../src/clients/vacationClient';

vi.mock('../../../src/clients/employeeClient');
vi.mock('../../../src/clients/contractClient');
vi.mock('../../../src/clients/vacationClient');

const TOKEN = 'Bearer test-token';

const mockEmp      = { id: 1, nombre: 'Ana', apellido: 'García', estado: 'activo' };
const mockCargo    = { id: 1, cargo: 'Dev', salario: 5_000_000 };
const mockContrato = { id: 1, tipo: 'indefinido' };
const mockVacacion = { id: 1, estado: 'aprobada' };
const mockDisp     = { dias_disponibles: 10 };

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportService();
  });

  // ── getReporteEmpleado ──────────────────────────────────────────────────────

  describe('getReporteEmpleado', () => {
    it('returns consolidated data when all services respond', async () => {
      vi.mocked(empClient.getEmpleado).mockResolvedValue(mockEmp);
      vi.mocked(empClient.getHistorialCargo).mockResolvedValue([mockCargo]);
      vi.mocked(conClient.getContratosPorEmpleado).mockResolvedValue([mockContrato]);
      vi.mocked(vacClient.getVacacionesPorEmpleado).mockResolvedValue([mockVacacion]);
      vi.mocked(vacClient.getDiasDisponibles).mockResolvedValue(mockDisp);

      const result = await service.getReporteEmpleado(1, TOKEN);

      expect(result.empleado).toEqual(mockEmp);
      expect(result.historial_cargo).toEqual([mockCargo]);
      expect(result.contratos).toEqual([mockContrato]);
      expect(result.vacaciones).toEqual([mockVacacion]);
      expect(result.disponibles).toEqual(mockDisp);
      expect(result.advertencias).toHaveLength(0);
      expect(result.generado_en).toBeDefined();
    });

    it('returns partial data with a warning when one service fails', async () => {
      vi.mocked(empClient.getEmpleado).mockResolvedValue(mockEmp);
      vi.mocked(empClient.getHistorialCargo).mockResolvedValue([mockCargo]);
      vi.mocked(conClient.getContratosPorEmpleado).mockRejectedValue(new Error('Contract service down'));
      vi.mocked(vacClient.getVacacionesPorEmpleado).mockResolvedValue([]);
      vi.mocked(vacClient.getDiasDisponibles).mockResolvedValue(null);

      const result = await service.getReporteEmpleado(1, TOKEN);

      expect(result.empleado).toEqual(mockEmp);
      expect(result.contratos).toBeNull();
      expect(result.advertencias).toHaveLength(1);
      expect(result.advertencias[0]).toContain('contratos');
    });

    it('returns all nulls with 5 warnings when all services fail', async () => {
      vi.mocked(empClient.getEmpleado).mockRejectedValue(new Error('down'));
      vi.mocked(empClient.getHistorialCargo).mockRejectedValue(new Error('down'));
      vi.mocked(conClient.getContratosPorEmpleado).mockRejectedValue(new Error('down'));
      vi.mocked(vacClient.getVacacionesPorEmpleado).mockRejectedValue(new Error('down'));
      vi.mocked(vacClient.getDiasDisponibles).mockRejectedValue(new Error('down'));

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
      vi.mocked(empClient.getEmpleados).mockResolvedValue([mockEmp]);
      vi.mocked(empClient.getCargoActual).mockResolvedValue(mockCargo);
      vi.mocked(vacClient.getDiasDisponibles).mockResolvedValue(mockDisp);

      const result = await service.getEstadoLaboral(TOKEN);

      expect(result.total).toBe(1);
      expect(result.empleados[0].empleado).toEqual(mockEmp);
      expect(result.empleados[0].cargo_actual).toEqual(mockCargo);
      expect(result.empleados[0].disponibles).toEqual(mockDisp);
      expect(result.advertencias).toHaveLength(0);
    });

    it('returns empty list with warning when employee service fails', async () => {
      vi.mocked(empClient.getEmpleados).mockRejectedValue(new Error('Employee service down'));

      const result = await service.getEstadoLaboral(TOKEN);

      expect(result.empleados).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.advertencias).toHaveLength(1);
      expect(result.advertencias[0]).toContain('empleados');
    });

    it('sets cargo_actual and disponibles to null when enrichment fails', async () => {
      vi.mocked(empClient.getEmpleados).mockResolvedValue([mockEmp]);
      vi.mocked(empClient.getCargoActual).mockRejectedValue(new Error('cargo not found'));
      vi.mocked(vacClient.getDiasDisponibles).mockRejectedValue(new Error('vac not found'));

      const result = await service.getEstadoLaboral(TOKEN);

      expect(result.total).toBe(1);
      expect(result.empleados[0].cargo_actual).toBeNull();
      expect(result.empleados[0].disponibles).toBeNull();
    });

    it('handles multiple employees with mixed enrichment results', async () => {
      const emp2 = { id: 2, nombre: 'Pedro', apellido: 'Ruiz', estado: 'activo' };
      vi.mocked(empClient.getEmpleados).mockResolvedValue([mockEmp, emp2]);
      vi.mocked(empClient.getCargoActual)
        .mockResolvedValueOnce(mockCargo)
        .mockRejectedValueOnce(new Error('not found'));
      vi.mocked(vacClient.getDiasDisponibles).mockResolvedValue(mockDisp);

      const result = await service.getEstadoLaboral(TOKEN);

      expect(result.total).toBe(2);
      expect(result.empleados[0].cargo_actual).toEqual(mockCargo);
      expect(result.empleados[1].cargo_actual).toBeNull();
    });
  });

  // ── getReporteVacaciones ───────────────────────────────────────────────────

  describe('getReporteVacaciones', () => {
    it('returns vacation list with no advertencias', async () => {
      vi.mocked(vacClient.getAllVacaciones).mockResolvedValue([mockVacacion]);

      const result = await service.getReporteVacaciones(TOKEN);

      expect(result.data).toEqual([mockVacacion]);
      expect(result.advertencias).toHaveLength(0);
    });

    it('forwards filter params to the vacation client', async () => {
      vi.mocked(vacClient.getAllVacaciones).mockResolvedValue([]);

      await service.getReporteVacaciones(TOKEN, { desde: '2024-01-01', hasta: '2024-12-31', estado: 'aprobada' });

      expect(vacClient.getAllVacaciones).toHaveBeenCalledWith(TOKEN, { desde: '2024-01-01', hasta: '2024-12-31', estado: 'aprobada' });
    });

    it('returns empty data with warning when vacation service fails', async () => {
      vi.mocked(vacClient.getAllVacaciones).mockRejectedValue(new Error('down'));

      const result = await service.getReporteVacaciones(TOKEN);

      expect(result.data).toHaveLength(0);
      expect(result.advertencias).toHaveLength(1);
    });
  });

  // ── getReporteContratos ────────────────────────────────────────────────────

  describe('getReporteContratos', () => {
    it('returns contract list with no advertencias', async () => {
      vi.mocked(conClient.getAllContratos).mockResolvedValue([mockContrato]);

      const result = await service.getReporteContratos(TOKEN);

      expect(result.data).toEqual([mockContrato]);
      expect(result.advertencias).toHaveLength(0);
    });

    it('forwards filter params to the contract client', async () => {
      vi.mocked(conClient.getAllContratos).mockResolvedValue([]);

      await service.getReporteContratos(TOKEN, { estado: 'activo' });

      expect(conClient.getAllContratos).toHaveBeenCalledWith(TOKEN, { estado: 'activo' });
    });

    it('returns empty data with warning when contract service fails', async () => {
      vi.mocked(conClient.getAllContratos).mockRejectedValue(new Error('down'));

      const result = await service.getReporteContratos(TOKEN);

      expect(result.data).toHaveLength(0);
      expect(result.advertencias).toHaveLength(1);
    });
  });

  // ── getReporteTurnover ─────────────────────────────────────────────────────

  describe('getReporteTurnover', () => {
    it('returns retired employees count and data', async () => {
      const retired = { ...mockEmp, estado: 'retirado' };
      vi.mocked(empClient.getEmpleados).mockResolvedValue([retired]);

      const result = await service.getReporteTurnover(TOKEN, '2024-01-01', '2024-12-31');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.advertencias).toHaveLength(0);
    });

    it('passes date range and estado=retirado to the employee client', async () => {
      vi.mocked(empClient.getEmpleados).mockResolvedValue([]);

      await service.getReporteTurnover(TOKEN, '2024-01-01', '2024-06-30');

      expect(empClient.getEmpleados).toHaveBeenCalledWith(TOKEN, {
        estado: 'retirado',
        limit: 1000,
        desde: '2024-01-01',
        hasta: '2024-06-30',
      });
    });

    it('passes undefined dates when no range is provided', async () => {
      vi.mocked(empClient.getEmpleados).mockResolvedValue([]);

      await service.getReporteTurnover(TOKEN);

      expect(empClient.getEmpleados).toHaveBeenCalledWith(TOKEN, {
        estado: 'retirado',
        limit: 1000,
        desde: undefined,
        hasta: undefined,
      });
    });

    it('returns empty data with warning when employee service fails', async () => {
      vi.mocked(empClient.getEmpleados).mockRejectedValue(new Error('down'));

      const result = await service.getReporteTurnover(TOKEN);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.advertencias).toHaveLength(1);
    });
  });

  // ── getEmpleadosCsv ───────────────────────────────────────────────────────

  describe('getEmpleadosCsv', () => {
    it('returns a CSV string with headers and employee data', async () => {
      vi.mocked(empClient.getAllEmpleados).mockResolvedValue([mockEmp]);

      const csv = await service.getEmpleadosCsv(TOKEN);

      expect(typeof csv).toBe('string');
      expect(csv).toContain('Nombre');
      expect(csv).toContain('Ana');
    });

    it('returns only the header row when no employees exist', async () => {
      vi.mocked(empClient.getAllEmpleados).mockResolvedValue([]);

      const csv = await service.getEmpleadosCsv(TOKEN);

      expect(csv).toContain('ID');
      expect(csv).toContain('Cédula');
      expect(csv.split('\r\n')).toHaveLength(1);
    });

    it('propagates getAllEmpleados errors (no fallback)', async () => {
      vi.mocked(empClient.getAllEmpleados).mockRejectedValue(new Error('Employee service unavailable'));

      await expect(service.getEmpleadosCsv(TOKEN)).rejects.toThrow('Employee service unavailable');
    });
  });
});
