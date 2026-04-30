import axios from 'axios';
import { env } from '../config/env';

export interface AccionPayload {
  usuario_email?: string;
  rol?: string;
  accion: string;
  resultado?: 'exitoso' | 'fallido' | 'denegado';
  detalle?: string;
  ip_origen?: string;
  user_agent?: string;
}

export const registrarAccion = (datos: AccionPayload): void => {
  axios
    .post(`${env.historyServiceUrl}/api/historial/acciones`, datos, { timeout: 3000 })
    .catch((err: Error) => {
      console.warn('[HistoryService] No se pudo registrar acción:', err.message);
    });
};
