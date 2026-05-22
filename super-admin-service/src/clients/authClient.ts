import axios from 'axios';
import { env } from '../config/env';

export interface RegistrarUsuarioPayload {
  firstName: string;
  lastName:  string;
  email:     string;
  password:  string;
  role:      'ADMIN' | 'HR' | 'CONSULTATION';
}

/** Registers a new user in the Auth Service on behalf of a company. */
export const registrarUsuario = async (datos: RegistrarUsuarioPayload): Promise<Record<string, unknown>> => {
  const response = await axios.post(
    `${env.authServiceUrl}/auth/register`,
    datos,
    { timeout: env.requestTimeoutMs },
  );
  return response.data as Record<string, unknown>;
};
