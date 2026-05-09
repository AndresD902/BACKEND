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
    .post(`${env.historyServiceUrl}/api/historial/acciones`, datos, {
      timeout: 3000,
      headers: { 'x-internal-key': env.internalApiKey },
    })
    .catch((err: Error) => {
      console.warn('[HistoryClient] No se pudo registrar acción:', err.message);
    });
};

export const obtenerAcciones = async (
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> => {
  const response = await axios.get(`${env.historyServiceUrl}/api/historial/acciones`, {
    headers: { Authorization: token, 'x-internal-key': env.internalApiKey },
    params,
    timeout: env.requestTimeoutMs,
  });
  return unwrapHistoryList(response.data, 'acciones');
};

export const obtenerCambios = async (
  token: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>[]> => {
  const response = await axios.get(`${env.historyServiceUrl}/api/historial/cambios`, {
    headers: { Authorization: token, 'x-internal-key': env.internalApiKey },
    params,
    timeout: env.requestTimeoutMs,
  });
  return unwrapHistoryList(response.data, 'cambios');
};

function unwrapHistoryList(responseData: unknown, collectionKey: 'acciones' | 'cambios'): Record<string, unknown>[] {
  if (!responseData || typeof responseData !== 'object') {
    return [];
  }

  const data = (responseData as { data?: unknown }).data;
  if (Array.isArray(data)) {
    return data as Record<string, unknown>[];
  }

  if (data && typeof data === 'object') {
    const collection = (data as Record<string, unknown>)[collectionKey];
    if (Array.isArray(collection)) {
      return collection as Record<string, unknown>[];
    }
  }

  return [];
}
