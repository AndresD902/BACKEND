import axios from 'axios';
import { env } from '../config/env';

const BASE = env.employeeServiceUrl;
const TIMEOUT = env.requestTimeoutMs;

function headers(token: string) {
  return { Authorization: token };
}

export async function getEmpleados(
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<{ data: { empleados: Record<string, unknown>[] } }>(
    `${BASE}/empleados`,
    { headers: headers(token), params, timeout: TIMEOUT },
  );
  return data.data.empleados ?? [];
}

export async function getAllEmpleados(token: string): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<{ data: { empleados: Record<string, unknown>[] } }>(
    `${BASE}/empleados`,
    { headers: headers(token), params: { limit: 1000, page: 1 }, timeout: TIMEOUT },
  );
  return data.data.empleados ?? [];
}

export async function getEmpleado(
  id: number,
  token: string,
): Promise<Record<string, unknown>> {
  const { data } = await axios.get<{ data: Record<string, unknown> }>(
    `${BASE}/empleados/${id}`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return data.data;
}

export async function getCargoActual(
  empleadoId: number,
  token: string,
): Promise<Record<string, unknown> | null> {
  const { data } = await axios.get<{ data: Record<string, unknown> | null }>(
    `${BASE}/empleados/${empleadoId}/cargo-actual`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return data.data ?? null;
}

export async function getHistorialCargo(
  empleadoId: number,
  token: string,
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<{ data: Record<string, unknown>[] }>(
    `${BASE}/empleados/${empleadoId}/historial-cargo`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return data.data ?? [];
}
