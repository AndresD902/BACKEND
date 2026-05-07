import axios from 'axios';
import { env } from '../config/env';

export interface NotifyEmployeeChangePayload {
  userEmail: string;
  action: string;
  employeeName: string;
}

export interface NotifyCorrectionRequestPayload {
  empleadoNombre: string;
  descripcion: string;
  solicitante: string;
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

export const notificarSolicitudCorreccion = (datos: NotifyCorrectionRequestPayload): void => {
  axios
    .post(`${env.authServiceUrl}/internal/notify-correction-request`, datos, {
      headers: { 'x-internal-key': env.internalApiKey },
    })
    .catch((err: Error) => {
      console.warn('[AuthService] No se pudo enviar solicitud de corrección:', err.message);
    });
};
