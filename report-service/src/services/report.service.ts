import * as emp  from '../clients/employeeClient';
import * as con  from '../clients/contractClient';
import * as vac  from '../clients/vacationClient';
import { ReporteEmpleado, ReporteEstadoLaboral } from '../entities/create-report-request.dto';
import { buildEmployeeCsv } from '../utils/report-formatter.util';

// Extracts data from a Promise.allSettled result, appending a warning on failure.
function extract<T>(
  result: PromiseSettledResult<T>,
  label: string,
  advertencias: string[],
): T | null {
  if (result.status === 'fulfilled') return result.value;
  advertencias.push(`No se pudo obtener ${label}: ${String((result.reason as Error)?.message ?? result.reason)}`);
  return null;
}

export class ReportService {
  // ─── Ficha completa de un empleado ─────────────────────────────────────────

  async getReporteEmpleado(empleadoId: number, token: string): Promise<ReporteEmpleado> {
    const advertencias: string[] = [];

    const [empleado, historialCargo, contratos, vacaciones, disponibles] =
      await Promise.allSettled([
        emp.getEmpleado(empleadoId, token),
        emp.getHistorialCargo(empleadoId, token),
        con.getContratosPorEmpleado(empleadoId, token),
        vac.getVacacionesPorEmpleado(empleadoId, token),
        vac.getDiasDisponibles(empleadoId, token),
      ]);

    return {
      empleado:        extract(empleado,       'datos del empleado',    advertencias),
      historial_cargo: extract(historialCargo, 'historial de cargos',   advertencias),
      contratos:       extract(contratos,      'contratos',             advertencias),
      vacaciones:      extract(vacaciones,     'vacaciones',            advertencias),
      disponibles:     extract(disponibles,    'días disponibles',      advertencias),
      advertencias,
      generado_en: new Date().toISOString(),
    };
  }

  // ─── Estado laboral: empleados activos con cargo y días disponibles ────────

  async getEstadoLaboral(token: string): Promise<ReporteEstadoLaboral> {
    const advertencias: string[] = [];

    let empleados: Record<string, unknown>[] = [];
    try {
      empleados = await emp.getEmpleados(token, { estado: 'activo', limit: 500 });
    } catch (err) {
      advertencias.push(`No se pudieron obtener empleados: ${String((err as Error)?.message)}`);
      return { empleados: [], total: 0, advertencias, generado_en: new Date().toISOString() };
    }

    const enriched = await Promise.all(
      empleados.map(async (empleado) => {
        const id = Number(empleado['id']);
        const [cargoResult, dispResult] = await Promise.allSettled([
          emp.getCargoActual(id, token),
          vac.getDiasDisponibles(id, token),
        ]);
        return {
          empleado,
          cargo_actual: cargoResult.status === 'fulfilled' ? cargoResult.value : null,
          disponibles:  dispResult.status  === 'fulfilled' ? dispResult.value  : null,
        };
      }),
    );

    return {
      empleados: enriched,
      total:     enriched.length,
      advertencias,
      generado_en: new Date().toISOString(),
    };
  }

  // ─── Resumen de vacaciones ─────────────────────────────────────────────────

  async getReporteVacaciones(
    token: string,
    params: Record<string, unknown> = {},
  ): Promise<{ data: Record<string, unknown>[]; advertencias: string[]; generado_en: string }> {
    const advertencias: string[] = [];
    let data: Record<string, unknown>[] = [];

    try {
      data = await vac.getAllVacaciones(token, params);
    } catch (err) {
      advertencias.push(`No se pudieron obtener vacaciones: ${String((err as Error)?.message)}`);
    }

    return { data, advertencias, generado_en: new Date().toISOString() };
  }

  // ─── Resumen de contratos ─────────────────────────────────────────────────

  async getReporteContratos(
    token: string,
    params: Record<string, unknown> = {},
  ): Promise<{ data: Record<string, unknown>[]; advertencias: string[]; generado_en: string }> {
    const advertencias: string[] = [];
    let data: Record<string, unknown>[] = [];

    try {
      data = await con.getAllContratos(token, params);
    } catch (err) {
      advertencias.push(`No se pudieron obtener contratos: ${String((err as Error)?.message)}`);
    }

    return { data, advertencias, generado_en: new Date().toISOString() };
  }

  // ─── Turnover: empleados retirados en un rango de fechas ──────────────────

  async getReporteTurnover(
    token: string,
    desde?: string,
    hasta?: string,
  ): Promise<{ data: Record<string, unknown>[]; total: number; advertencias: string[]; generado_en: string }> {
    const advertencias: string[] = [];
    let empleados: Record<string, unknown>[] = [];

    try {
      empleados = await emp.getEmpleados(token, { estado: 'retirado', limit: 1000, desde, hasta });
    } catch (err) {
      advertencias.push(`No se pudieron obtener empleados retirados: ${String((err as Error)?.message)}`);
    }

    return {
      data: empleados,
      total: empleados.length,
      advertencias,
      generado_en: new Date().toISOString(),
    };
  }

  // ─── CSV export de empleados (agrega desde employee-service) ──────────────

  async getEmpleadosCsv(token: string): Promise<string> {
    const empleados = await emp.getAllEmpleados(token);
    return buildEmployeeCsv(empleados as Record<string, unknown>[]);
  }
}

export const reportService = new ReportService();
