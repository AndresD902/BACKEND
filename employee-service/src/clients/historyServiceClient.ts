import axios from 'axios';
import { env } from '../config/env';

export interface CambioPayload {
  empleado_id: number;
  entidad: string;
  entidad_id?: number;
  campo_modificado: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  usuario_modificador: string;
  rol_modificador: string;
  ip_origen?: string;
}

// Fire-and-forget: does NOT await the response intentionally.
// A failure in history-service must never block or roll back the main operation.
export const registrarCambio = (datos: CambioPayload): void => {
  axios
    .post(`${env.historyServiceUrl}/api/historial/cambios`, datos, {
      timeout: 3000,
      headers: { 'x-internal-key': env.internalApiKey },
    })
    .catch((err: Error) => {
      console.warn('[HistoryService] No se pudo registrar cambio:', err.message);
    });
};
