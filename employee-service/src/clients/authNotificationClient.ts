import axios from 'axios';
import { env } from '../config/env';

export interface NotifyEmployeeChangePayload {
  userEmail: string;
  action: string;
  employeeName: string;
}

// Fire-and-forget: a failure in auth-service must never block the main operation.
export const notificarCambioEmpleado = (datos: NotifyEmployeeChangePayload): void => {
  axios
    .post(`${env.authServiceUrl}/internal/notify-employee-change`, datos, {
      headers: { 'x-internal-key': env.internalApiKey },
    })
    .catch((err: Error) => {
      console.warn('[AuthService] No se pudo enviar notificación de cambio:', err.message);
    });
};
