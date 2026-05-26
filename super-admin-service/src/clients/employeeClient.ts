import axios from 'axios';
import { env } from '../config/env';

/** Fetches employees for a company through the internal Employee Service API. */
export const getEmpleadosPorEmpresa = async (
  empresaId: number,
): Promise<Record<string, unknown>[]> => {
  const response = await axios.get(`${env.employeeServiceUrl}/internal/empresas/${empresaId}/empleados`, {
    headers: { 'x-internal-key': env.internalApiKey },
    timeout: env.requestTimeoutMs,
  });
  return (response.data as { data?: Record<string, unknown>[] }).data ?? [];
};
