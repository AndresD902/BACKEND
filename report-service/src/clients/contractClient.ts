import axios from 'axios';
import { env } from '../config/env';

const BASE = env.contractServiceUrl;
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

function normalizeContract(record: Record<string, unknown>): Record<string, unknown> {
  return {
    ...record,
    empleado_id: record.empleado_id ?? record.employeeId,
    tipo_contrato: record.tipo_contrato ?? record.tipo ?? record.type,
    salario: record.salario ?? record.salary,
    moneda: record.moneda ?? record.currency,
    fecha_inicio: record.fecha_inicio ?? record.startDate,
    fecha_fin: record.fecha_fin ?? record.endDate,
    metodo_pago: record.metodo_pago ?? record.paymentMethod,
    periodicidad_pago: record.periodicidad_pago ?? record.paymentFrequency,
    lugar_trabajo: record.lugar_trabajo ?? record.workplace,
    modalidad: record.modalidad ?? record.workMode,
    jornada: record.jornada ?? record.workSchedule,
    archivo_s3_key: record.archivo_s3_key ?? record.fileS3Key,
    archivo_s3_url: record.archivo_s3_url ?? record.fileS3URL ?? record.fileS3Url,
    estado: record.estado ?? record.status,
    creado_por: record.creado_por ?? record.createdBy,
    fecha_creacion: record.fecha_creacion ?? record.createdAt,
    fecha_actualizacion: record.fecha_actualizacion ?? record.updatedAt,
  };
}

function dateOnly(value: unknown): string | null {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function matchesFilters(contract: Record<string, unknown>, params: Record<string, unknown>): boolean {
  const empleadoId = params['empleado_id'] ?? params['employeeId'];
  const estado = params['estado'] ?? params['status'];
  const desde = dateOnly(params['desde']);
  const hasta = dateOnly(params['hasta']);
  const fechaInicio = dateOnly(contract['fecha_inicio']);
  const fechaFin = dateOnly(contract['fecha_fin']);

  if (empleadoId && String(contract['empleado_id']) !== String(empleadoId)) return false;
  if (estado && String(contract['estado']) !== String(estado)) return false;
  if (desde && fechaInicio && fechaInicio < desde) return false;
  if (hasta && fechaFin && fechaFin > hasta) return false;

  return true;
}

export async function getContratosPorEmpleado(
  empleadoId: number,
  token: string,
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<unknown>(
    `${BASE}/contratos/empleado/${empleadoId}`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return unwrapArray(data).map(normalizeContract);
}

export async function getAllContratos(
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<unknown>(
    `${BASE}/contratos`,
    { headers: headers(token), params, timeout: TIMEOUT },
  );
  return unwrapArray(data)
    .map(normalizeContract)
    .filter((contract) => matchesFilters(contract, params));
}
