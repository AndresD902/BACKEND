import axios from 'axios';
import { env } from '../config/env';

export interface RegistrarUsuarioPayload {
  cedula:   string;
  email:    string;
  password: string;
  rol:      'admin' | 'rrhh' | 'consulta';
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
