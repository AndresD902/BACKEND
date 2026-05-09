import axios from 'axios';
import { env } from '../config/env';

const BASE = env.vacationServiceUrl;
const TIMEOUT = env.requestTimeoutMs;

function headers(token: string) {
  return { Authorization: token };
}

function unwrapArray(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as { data: Record<string, unknown>[] }).data;
  }
  return [];
}

function unwrapObject(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  if ('data' in data) {
    const value = (data as { data?: unknown }).data;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }
  return Array.isArray(data) ? null : data as Record<string, unknown>;
}

function normalizeVacation(record: Record<string, unknown>): Record<string, unknown> {
  return {
    ...record,
    empleado_id: record.empleado_id ?? record.empleadoId,
    fecha_inicio: record.fecha_inicio ?? record.fechaInicio,
    fecha_fin: record.fecha_fin ?? record.fechaFin,
    dias_habiles: record.dias_habiles ?? record.diasHabiles,
    dias_calendario: record.dias_calendario ?? record.diasCalendario,
    motivo_rechazo: record.motivo_rechazo ?? record.motivoRechazo,
    aprobado_por: record.aprobado_por ?? record.aprobadoPor,
    fecha_aprobacion: record.fecha_aprobacion ?? record.fechaAprobacion,
    fecha_solicitud: record.fecha_solicitud ?? record.fechaSolicitud,
    fecha_actualizacion: record.fecha_actualizacion ?? record.fechaActualizacion,
  };
}

function normalizeDias(record: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!record) return null;
  return {
    ...record,
    empleado_id: record.empleado_id ?? record.empleadoId,
    dias_totales: record.dias_totales ?? record.diasTotales,
    dias_usados: record.dias_usados ?? record.diasUsados,
    dias_pendientes: record.dias_pendientes ?? record.diasPendientes,
    dias_disponibles: record.dias_disponibles ?? record.diasDisponibles,
    fecha_creacion: record.fecha_creacion ?? record.fechaCreacion,
    fecha_actualizacion: record.fecha_actualizacion ?? record.fechaActualizacion,
  };
}

export async function getVacacionesPorEmpleado(
  empleadoId: number,
  token: string,
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<unknown>(
    `${BASE}/vacaciones/empleado/${empleadoId}`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return unwrapArray(data).map(normalizeVacation);
}

export async function getDiasDisponibles(
  empleadoId: number,
  token: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await axios.get<unknown>(
    `${BASE}/vacaciones/empleado/${empleadoId}/disponibles`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return normalizeDias(unwrapObject(data));
}

export async function getAllVacaciones(
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<unknown>(
    `${BASE}/vacaciones`,
    { headers: headers(token), params, timeout: TIMEOUT },
  );
  return unwrapArray(data).map(normalizeVacation);
}
