// Downstream data shapes returned by the dependent microservices.
// These are intentionally permissive (Record<string, unknown>) because
// report-service does not own those schemas — it only aggregates them.

export type EmpleadoData    = Record<string, unknown>;
export type CargoData       = Record<string, unknown>;
export type ContratoData    = Record<string, unknown>;
export type VacacionData    = Record<string, unknown>;
export type DisponibleData  = Record<string, unknown>;

export interface ReporteEmpleado {
  empleado:        EmpleadoData   | null;
  historial_cargo: CargoData[]    | null;
  contratos:       ContratoData[] | null;
  vacaciones:      VacacionData[] | null;
  disponibles:     DisponibleData | null;
  advertencias:    string[];
  generado_en:     string;
}

export interface ReporteEstadoLaboral {
  empleados: Array<{
    empleado:    EmpleadoData;
    cargo_actual: CargoData | null;
    disponibles:  DisponibleData | null;
  }>;
  total:       number;
  advertencias: string[];
  generado_en:  string;
}
