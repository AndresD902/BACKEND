import axios from 'axios';
import { env } from '../config/env';

export interface CambioPayload {
  empleado_id: number;
  tipo_accion: string;
  entidad: string;
  entidad_id?: number;
  campo_modificado: string;
  valor_anterior?: string | null;
  valor_nuevo?: string | null;
  usuario_modificador: string;
  rol_modificador: string;
  ip_origen?: string;
  user_agent?: string;
}

export const registrarCambio = (datos: CambioPayload): void => {
  axios
    .post(`${env.historyServiceUrl}/api/historial/cambios`, datos, { timeout: 3000 })
    .catch((err: Error) => {
      console.warn('[HistoryService] No se pudo registrar cambio:', err.message);
    });
};
