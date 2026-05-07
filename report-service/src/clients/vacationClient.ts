import axios from 'axios';
import { env } from '../config/env';

const BASE = env.vacationServiceUrl;
const TIMEOUT = env.requestTimeoutMs;

function headers(token: string) {
  return { Authorization: token };
}

export async function getVacacionesPorEmpleado(
  empleadoId: number,
  token: string,
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<{ data: Record<string, unknown>[] }>(
    `${BASE}/vacaciones/empleado/${empleadoId}`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return data.data ?? [];
}

export async function getDiasDisponibles(
  empleadoId: number,
  token: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await axios.get<{ data: Record<string, unknown> }>(
    `${BASE}/vacaciones/empleado/${empleadoId}/disponibles`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return data.data ?? null;
}

export async function getAllVacaciones(
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<{ data: Record<string, unknown>[] }>(
    `${BASE}/vacaciones`,
    { headers: headers(token), params, timeout: TIMEOUT },
  );
  return data.data ?? [];
}
