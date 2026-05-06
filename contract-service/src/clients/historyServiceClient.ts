import { env } from '../config/env';

export interface ContractHistoryPayload {
  empleado_id: number;
  entidad: string;
  entidad_id?: number;
  campo_modificado: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  usuario_modificador: string;
  rol_modificador?: string;
  ip_origen?: string;
}

export function registrarCambio(payload: ContractHistoryPayload): void {
  const historyServiceUrl = env.historyServiceUrl.replace(/\/$/, '');

  fetch(`${historyServiceUrl}/api/historial/cambios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  }).catch((error: Error) => {
    console.warn('[HistoryService] Could not register contract change:', error.message);
  });
}
