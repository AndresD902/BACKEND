import axios from 'axios';
import { env } from '../config/env';

const BASE = env.contractServiceUrl;
const TIMEOUT = env.requestTimeoutMs;

function headers(token: string) {
  return { Authorization: token };
}

export async function getContratosPorEmpleado(
  empleadoId: number,
  token: string,
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<{ data: Record<string, unknown>[] }>(
    `${BASE}/contratos/empleado/${empleadoId}`,
    { headers: headers(token), timeout: TIMEOUT },
  );
  return data.data ?? [];
}

export async function getAllContratos(
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> {
  const { data } = await axios.get<{ data: Record<string, unknown>[] }>(
    `${BASE}/contratos`,
    { headers: headers(token), params, timeout: TIMEOUT },
  );
  return data.data ?? [];
}
