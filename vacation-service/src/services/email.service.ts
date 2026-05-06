import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host:   env.smtpHost,
  port:   env.smtpPort,
  secure: false,
  auth:   { user: env.smtpUser, pass: env.smtpPass },
});

export interface EmailSolicitudData {
  empleadoNombre: string;
  fechaInicio: string;
  fechaFin: string;
  diasHabiles: number;
  emailRRHH: string;
}

export interface EmailAprobacionData {
  empleadoNombre: string;
  fechaInicio: string;
  fechaFin: string;
  emailRRHH: string;
}

export interface EmailRechazoData {
  empleadoNombre: string;
  fechaInicio: string;
  fechaFin: string;
  motivoRechazo: string;
  emailRRHH: string;
}

export class EmailService {
  async notificarSolicitudRRHH(data: EmailSolicitudData): Promise<void> {
    try {
      await transporter.sendMail({
        from:    `"Sistema RRHH" <${env.smtpUser}>`,
        to:      data.emailRRHH,
        subject: `Nueva solicitud de vacaciones — ${data.empleadoNombre}`,
        html: `
          <h2>Nueva solicitud de vacaciones</h2>
          <p><strong>Empleado:</strong> ${data.empleadoNombre}</p>
          <p><strong>Período:</strong> ${data.fechaInicio} al ${data.fechaFin}</p>
          <p><strong>Días hábiles:</strong> ${data.diasHabiles}</p>
          <p>Tiene <strong>3 días hábiles</strong> para aprobar o rechazar esta solicitud.</p>
          <a href="${env.frontendUrl}/vacaciones">Ver solicitud en el sistema</a>
        `,
      });
    } catch (err) {
      console.warn('[EmailService] No se pudo enviar correo de solicitud:', (err as Error).message);
    }
  }

  async notificarAprobacion(data: EmailAprobacionData): Promise<void> {
    try {
      await transporter.sendMail({
        from:    `"Sistema RRHH" <${env.smtpUser}>`,
        to:      data.emailRRHH,
        subject: `Vacaciones aprobadas — ${data.empleadoNombre}`,
        html: `
          <h2>Solicitud de vacaciones aprobada</h2>
          <p><strong>Empleado:</strong> ${data.empleadoNombre}</p>
          <p><strong>Período aprobado:</strong> ${data.fechaInicio} al ${data.fechaFin}</p>
        `,
      });
    } catch (err) {
      console.warn('[EmailService] No se pudo enviar correo de aprobación:', (err as Error).message);
    }
  }

  async notificarRechazo(data: EmailRechazoData): Promise<void> {
    try {
      await transporter.sendMail({
        from:    `"Sistema RRHH" <${env.smtpUser}>`,
        to:      data.emailRRHH,
        subject: `Solicitud de vacaciones rechazada — ${data.empleadoNombre}`,
        html: `
          <h2>Solicitud de vacaciones rechazada</h2>
          <p><strong>Empleado:</strong> ${data.empleadoNombre}</p>
          <p><strong>Período solicitado:</strong> ${data.fechaInicio} al ${data.fechaFin}</p>
          <p><strong>Motivo:</strong> ${data.motivoRechazo}</p>
        `,
      });
    } catch (err) {
      console.warn('[EmailService] No se pudo enviar correo de rechazo:', (err as Error).message);
    }
  }
}
