import axios from 'axios';
import { env } from '../config/env';

export async function isRegisteredEmployee(email: string): Promise<boolean> {
  try {
    const { data } = await axios.get<{ success: boolean; exists: boolean }>(
      `${env.employeeServiceUrl}/internal/check-email`,
      {
        params: { email },
        headers: { 'x-internal-key': env.internalApiKey },
        timeout: 5000,
      },
    );
    return data.exists === true;
  } catch {
    // If employee-service is unreachable, block registration to avoid security gaps.
    return false;
  }
}

export async function getEmployeeIdByEmail(email: string): Promise<number | null> {
  try {
    const { data } = await axios.get<{ success: boolean; id: number }>(
      `${env.employeeServiceUrl}/internal/employee-id-by-email`,
      {
        params: { email },
        headers: { 'x-internal-key': env.internalApiKey },
        timeout: 5000,
      },
    );
    return data.id ?? null;
  } catch {
    return null;
  }
}
