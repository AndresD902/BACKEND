import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env';
import { Empleado } from '../entities/employee.entity';

export interface ProvisionConsultantAccountInput {
  empleado: Empleado;
  companyId?: number;
}

export interface ProvisionConsultantAccountResult {
  created: boolean;
  email: string;
  temporaryPassword?: string;
}

export type ProvisionConsultantAccountFn = (
  input: ProvisionConsultantAccountInput,
) => Promise<ProvisionConsultantAccountResult>;

export function generateTemporaryPassword(): string {
  return `Hr-${crypto.randomBytes(9).toString('base64url')}1!`;
}

export const provisionConsultantAccount: ProvisionConsultantAccountFn = async ({ empleado, companyId }) => {
  const temporaryPassword = generateTemporaryPassword();
  const email = empleado.correo_corporativo.toLowerCase();

  try {
    await axios.post(
      `${env.authServiceUrl}/internal/users`,
      {
        firstName: empleado.nombre,
        lastName: empleado.apellido,
        email,
        password: temporaryPassword,
        role: 'CONSULTATION',
        companyId,
        employeeId: empleado.id,
        emailVerified: true,
        mustChangePassword: true,
      },
      {
        headers: { 'x-internal-key': env.internalApiKey },
        timeout: 5000,
      },
    );

    return { created: true, email, temporaryPassword };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      return { created: false, email };
    }
    throw error;
  }
};
