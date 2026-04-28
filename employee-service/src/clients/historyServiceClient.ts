import axios from 'axios';
import { env } from '../config/env';
//feature/employee-service-history-service-client
interface CambioPayload {
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

export const registrarCambio = (datos: CambioPayload): void => {
  axios
    .post(`${env.historyServiceUrl}/api/historial/cambios`, datos)
    .catch((err: Error) => {
      console.warn('[HistoryService] No se pudo registrar cambio:', err.message);
    });
};
