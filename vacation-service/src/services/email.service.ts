import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export interface EmailSolicitudData {
  empleadoNombre: string;
  fechaInicio:    string;
  fechaFin:       string;
  diasHabiles:    number;
  emailRRHH:      string;
}

export interface EmailAprobacionData {
  empleadoNombre: string;
  fechaInicio:    string;
  fechaFin:       string;
  emailRRHH:      string;
}

export interface EmailRechazoData {
  empleadoNombre: string;
  fechaInicio:    string;
  fechaFin:       string;
  motivoRechazo:  string;
  emailRRHH:      string;
}

/**
 * Escapes characters that have special meaning in HTML to prevent XSS
 * when embedding user-supplied content inside email templates.
 */
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Sends transactional email notifications for vacation state changes.
 *
 * All public methods swallow SMTP errors and log a warning so that
 * email failures never propagate to the caller.
 *
 * @example
 * // Production — uses real SMTP from env
 * const svc = new EmailService();
 *
 * // Testing — inject a mock transporter
 * const svc = new EmailService(mockTransporter);
 */
export class EmailService {
  private readonly transporter: Transporter;

  constructor(transporter?: Transporter) {
    this.transporter = transporter ?? nodemailer.createTransport({
      host:   env.smtpHost,
      port:   env.smtpPort,
      secure: env.smtpSecure,
      auth:   { user: env.smtpUser, pass: env.smtpPass },
    });
  }

  /** Notifies HR that a new vacation request has been submitted. */
  async notificarSolicitudRRHH(data: EmailSolicitudData): Promise<void> {
    try {
      const nombre = escapeHtml(data.empleadoNombre);
      await this.transporter.sendMail({
        from:    `"Sistema RRHH" <${env.smtpUser}>`,
        to:      data.emailRRHH,
        subject: `Nueva solicitud de vacaciones — ${nombre}`,
        html: `
          <h2>Nueva solicitud de vacaciones</h2>
          <p><strong>Empleado:</strong> ${nombre}</p>
          <p><strong>Período:</strong> ${escapeHtml(data.fechaInicio)} al ${escapeHtml(data.fechaFin)}</p>
          <p><strong>Días hábiles:</strong> ${data.diasHabiles}</p>
          <p>Tiene <strong>3 días hábiles</strong> para aprobar o rechazar esta solicitud.</p>
          <a href="${escapeHtml(env.frontendUrl)}/vacaciones">Ver solicitud en el sistema</a>
        `,
      });
    } catch (err) {
      console.warn('[EmailService] No se pudo enviar correo de solicitud:', (err as Error).message);
    }
  }

  /** Notifies HR that a vacation request has been approved. */
  async notificarAprobacion(data: EmailAprobacionData): Promise<void> {
    try {
      const nombre = escapeHtml(data.empleadoNombre);
      await this.transporter.sendMail({
        from:    `"Sistema RRHH" <${env.smtpUser}>`,
        to:      data.emailRRHH,
        subject: `Vacaciones aprobadas — ${nombre}`,
        html: `
          <h2>Solicitud de vacaciones aprobada</h2>
          <p><strong>Empleado:</strong> ${nombre}</p>
          <p><strong>Período aprobado:</strong> ${escapeHtml(data.fechaInicio)} al ${escapeHtml(data.fechaFin)}</p>
        `,
      });
    } catch (err) {
      console.warn('[EmailService] No se pudo enviar correo de aprobación:', (err as Error).message);
    }
  }

  /** Notifies HR that a vacation request has been rejected, including the reason. */
  async notificarRechazo(data: EmailRechazoData): Promise<void> {
    try {
      const nombre = escapeHtml(data.empleadoNombre);
      await this.transporter.sendMail({
        from:    `"Sistema RRHH" <${env.smtpUser}>`,
        to:      data.emailRRHH,
        subject: `Solicitud de vacaciones rechazada — ${nombre}`,
        html: `
          <h2>Solicitud de vacaciones rechazada</h2>
          <p><strong>Empleado:</strong> ${nombre}</p>
          <p><strong>Período solicitado:</strong> ${escapeHtml(data.fechaInicio)} al ${escapeHtml(data.fechaFin)}</p>
          <p><strong>Motivo:</strong> ${escapeHtml(data.motivoRechazo)}</p>
        `,
      });
    } catch (err) {
      console.warn('[EmailService] No se pudo enviar correo de rechazo:', (err as Error).message);
    }
  }
}
