import axios from 'axios';
import { env } from '../config/env';

/** Fetches all employees from the Employee Service. */
export const getEmpleados = async (
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> => {
  const response = await axios.get(`${env.employeeServiceUrl}/empleados`, {
    headers: { Authorization: token },
    params:  { limit: 1000, ...params },
    timeout: env.requestTimeoutMs,
  });
  return (response.data as { data: Record<string, unknown>[] }).data ?? [];
};
