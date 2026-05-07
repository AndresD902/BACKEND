import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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

  async enviarCredencialesAdmin(data: {
    to:              string;
    adminEmail:      string;
    passwordTemporal: string;
    nombreEmpresa:   string;
  }): Promise<void> {
    const empresa  = escapeHtml(data.nombreEmpresa);
    const email    = escapeHtml(data.adminEmail);
    const password = escapeHtml(data.passwordTemporal);

    try {
      await this.transporter.sendMail({
        from:    env.smtpUser,
        to:      data.to,
        subject: `Credenciales de administrador — ${empresa}`,
        html: `
          <h2>Bienvenido a la plataforma HR</h2>
          <p>Se ha creado un administrador para la empresa <strong>${empresa}</strong>.</p>
          <table>
            <tr><td><strong>Correo:</strong></td><td>${email}</td></tr>
            <tr><td><strong>Contraseña temporal:</strong></td><td>${password}</td></tr>
          </table>
          <p>Por seguridad, cambia esta contraseña al iniciar sesión por primera vez.</p>
        `,
      });
    } catch (err) {
      console.warn('[EmailService] No se pudo enviar credenciales:', String((err as Error).message));
    }
  }

  async enviarRecuperacionContrasena(data: {
    to:         string;
    nombre:     string;
    resetToken: string;
  }): Promise<void> {
    const nombre     = escapeHtml(data.nombre);
    const resetUrl   = `${env.frontendUrl}/super-admin/reset-password?token=${encodeURIComponent(data.resetToken)}`;

    try {
      await this.transporter.sendMail({
        from:    env.smtpUser,
        to:      data.to,
        subject: 'Recuperación de contraseña — Super Admin',
        html: `
          <h2>Recuperación de contraseña</h2>
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>
            <a href="${resetUrl}" style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none">
              Restablecer contraseña
            </a>
          </p>
          <p>Este enlace expira en ${env.resetTokenExpiresMinutes} minutos.</p>
          <p>Si no solicitaste esto, ignora este correo.</p>
        `,
      });
    } catch (err) {
      console.warn('[EmailService] No se pudo enviar correo de recuperación:', String((err as Error).message));
    }
  }
}

export const emailService = new EmailService();
