import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService } from '../interfaces/email-service.interface';
import { env } from '../../config/env';

class SmtpEmailService implements IEmailService {
  private readonly transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  public async sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"HR System Admin" <${env.smtpFrom}>`,
      to: toEmail,
      subject: 'Restablecer contraseña — HR System',
      html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161B27;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;max-width:100%">
        <tr>
          <td style="padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.06)">
            <span style="font-size:17px;font-weight:700;color:#e2e8f0;letter-spacing:-0.3px">HR System Admin</span>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 36px 28px">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f1f5f9">
              Restablecer contraseña
            </h1>
            <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.7">
              Recibimos una solicitud para restablecer la contraseña asociada a esta cuenta.<br>
              Haz clic en el botón para continuar. El enlace expira en
              <strong style="color:#e2e8f0">${env.resetTokenExpiresMinutes} minutos</strong>.
            </p>
            <a href="${resetLink}"
               style="display:inline-block;padding:13px 28px;
                      background:linear-gradient(135deg,#22d3ee,#6366f1);
                      color:#fff;text-decoration:none;border-radius:10px;
                      font-size:14px;font-weight:600;letter-spacing:0.2px">
              Restablecer contraseña
            </a>
            <p style="margin:24px 0 0;font-size:12px;color:#64748b;line-height:1.6">
              Si no solicitaste este cambio, puedes ignorar este correo con seguridad.<br>
              Tu contraseña <strong>no será modificada</strong> si no haces clic en el enlace.
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#475569">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <span style="color:#6366f1;word-break:break-all">${resetLink}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:18px 36px;border-top:1px solid rgba(255,255,255,0.06)">
            <p style="margin:0;font-size:11px;color:#475569">
              © ${new Date().getFullYear()} HR System &middot; Correo generado automáticamente &middot; No respondas este mensaje
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      text: `Restablecer contraseña — HR System\n\nHaz clic en el siguiente enlace para restablecer tu contraseña (válido por ${env.resetTokenExpiresMinutes} min):\n${resetLink}\n\nSi no solicitaste este cambio, ignora este correo.`,
    });
  }
}

  public async sendLoginAlertEmail(toEmail: string, ipOrigin?: string, userAgent?: string): Promise<void> {
    const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const ip  = ipOrigin || 'desconocida';
    const ua  = userAgent ? userAgent.substring(0, 80) : 'desconocido';
    await this.transporter.sendMail({
      from: `"HR System Admin" <${env.smtpFrom}>`,
      to: toEmail,
      subject: 'Alerta de inicio de sesión — HR System',
      html: `
<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161B27;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;max-width:100%">
        <tr><td style="padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.06)">
          <span style="font-size:17px;font-weight:700;color:#e2e8f0">HR System Admin</span>
        </td></tr>
        <tr><td style="padding:36px 36px 28px">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f1f5f9">Nuevo inicio de sesión detectado</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.7">
            Se detectó un nuevo inicio de sesión en tu cuenta de HR System.
          </p>
          <table style="width:100%;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:20px">
            <tr><td style="padding:12px 16px;font-size:12px;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.04)">Fecha y hora</td>
                <td style="padding:12px 16px;font-size:13px;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.04)">${now}</td></tr>
            <tr><td style="padding:12px 16px;font-size:12px;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.04)">IP de origen</td>
                <td style="padding:12px 16px;font-size:13px;color:#e2e8f0;font-family:monospace;border-bottom:1px solid rgba(255,255,255,0.04)">${ip}</td></tr>
            <tr><td style="padding:12px 16px;font-size:12px;color:#64748b">Dispositivo</td>
                <td style="padding:12px 16px;font-size:12px;color:#94a3b8">${ua}</td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6">
            Si fuiste tú, puedes ignorar este mensaje. Si no reconoces este acceso,
            <strong style="color:#ef4444">cambia tu contraseña inmediatamente</strong> desde Configuración.
          </p>
        </td></tr>
        <tr><td style="padding:18px 36px;border-top:1px solid rgba(255,255,255,0.06)">
          <p style="margin:0;font-size:11px;color:#475569">© ${new Date().getFullYear()} HR System &middot; Correo automático &middot; No respondas</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      text: `Alerta de inicio de sesión — HR System\n\nFecha: ${now}\nIP: ${ip}\nDispositivo: ${ua}\n\nSi no fuiste tú, cambia tu contraseña inmediatamente.`,
    });
  }

  public async sendEmployeeChangeEmail(toEmail: string, action: string, employeeName: string): Promise<void> {
    const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const labels: Record<string, string> = {
      creacion: 'fue registrado en el sistema',
      actualizacion: 'fue actualizado',
      retiro: 'fue dado de baja del sistema',
      asignacion_cargo: 'recibió un nuevo cargo/salario',
    };
    const description = labels[action] ?? 'fue modificado';
    await this.transporter.sendMail({
      from: `"HR System Admin" <${env.smtpFrom}>`,
      to: toEmail,
      subject: `Cambio en empleado — HR System`,
      html: `
<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F1117;font-family:'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161B27;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;max-width:100%">
        <tr><td style="padding:28px 36px;border-bottom:1px solid rgba(255,255,255,0.06)">
          <span style="font-size:17px;font-weight:700;color:#e2e8f0">HR System Admin</span>
        </td></tr>
        <tr><td style="padding:36px 36px 28px">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#f1f5f9">Cambio registrado en empleado</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.7">
            Tu cuenta realizó la siguiente modificación en el sistema:
          </p>
          <table style="width:100%;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:20px">
            <tr><td style="padding:12px 16px;font-size:12px;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.04)">Empleado</td>
                <td style="padding:12px 16px;font-size:13px;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.04)">${employeeName}</td></tr>
            <tr><td style="padding:12px 16px;font-size:12px;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.04)">Acción</td>
                <td style="padding:12px 16px;font-size:13px;color:#22d3ee;border-bottom:1px solid rgba(255,255,255,0.04)">${description}</td></tr>
            <tr><td style="padding:12px 16px;font-size:12px;color:#64748b">Fecha</td>
                <td style="padding:12px 16px;font-size:13px;color:#e2e8f0">${now}</td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6">
            Este correo es una confirmación automática de tu acción en HR System.
            Puedes desactivar estas notificaciones en <strong style="color:#6366f1">Configuración → Notificaciones</strong>.
          </p>
        </td></tr>
        <tr><td style="padding:18px 36px;border-top:1px solid rgba(255,255,255,0.06)">
          <p style="margin:0;font-size:11px;color:#475569">© ${new Date().getFullYear()} HR System &middot; Correo automático &middot; No respondas</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      text: `Cambio en empleado — HR System\n\nEmpleado: ${employeeName}\nAcción: ${description}\nFecha: ${now}\n\nPuedes desactivar estas notificaciones en Configuración.`,
    });
  }
}

class ConsoleEmailService implements IEmailService {
  public async sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
    console.log('\n========== PASSWORD RESET EMAIL (sin SMTP configurado) ==========');
    console.log(`Para:   ${toEmail}`);
    console.log(`Enlace: ${resetLink}`);
    console.log('=================================================================\n');
  }

  public async sendLoginAlertEmail(toEmail: string, ipOrigin?: string, userAgent?: string): Promise<void> {
    console.log('\n========== LOGIN ALERT EMAIL (sin SMTP configurado) ==========');
    console.log(`Para:      ${toEmail}`);
    console.log(`IP origen: ${ipOrigin ?? 'desconocida'}`);
    console.log(`Agente:    ${userAgent ?? 'desconocido'}`);
    console.log('==============================================================\n');
  }

  public async sendEmployeeChangeEmail(toEmail: string, action: string, employeeName: string): Promise<void> {
    console.log('\n========== EMPLOYEE CHANGE EMAIL (sin SMTP configurado) ==========');
    console.log(`Para:     ${toEmail}`);
    console.log(`Empleado: ${employeeName}`);
    console.log(`Acción:   ${action}`);
    console.log('===================================================================\n');
  }
}

export const emailService: IEmailService = env.smtpUser && env.smtpPass
  ? new SmtpEmailService()
  : new ConsoleEmailService();
