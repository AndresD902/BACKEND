import axios from 'axios';
import { env } from '../config/env';

export interface AccionPayload {
  usuario_email?: string;
  rol?:           string;
  accion:         string;
  resultado?:     'exitoso' | 'fallido' | 'denegado';
  detalle?:       string;
  ip_origen?:     string;
  user_agent?:    string;
}

/** Fire-and-forget — a history failure must never block the main operation. */
export const registrarAccion = (datos: AccionPayload): void => {
  axios
    .post(`${env.historyServiceUrl}/api/historial/acciones`, datos, { timeout: 3000 })
    .catch((err: Error) => {
      console.warn('[HistoryClient] No se pudo registrar acción:', err.message);
    });
};

export const obtenerAcciones = async (
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> => {
  const response = await axios.get(`${env.historyServiceUrl}/api/historial/acciones`, {
    headers: { Authorization: token },
    params,
    timeout: env.requestTimeoutMs,
  });
  return (response.data as { data: Record<string, unknown>[] }).data ?? [];
};

export const obtenerCambios = async (
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> => {
  const response = await axios.get(`${env.historyServiceUrl}/api/historial/cambios`, {
    headers: { Authorization: token },
    params,
    timeout: env.requestTimeoutMs,
  });
  return (response.data as { data: Record<string, unknown>[] }).data ?? [];
};
