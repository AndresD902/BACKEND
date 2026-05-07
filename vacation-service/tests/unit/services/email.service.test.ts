import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Transporter } from 'nodemailer';
import { EmailService } from '../../../src/services/email.service';

vi.mock('../../../src/config/env', () => ({
  env: {
    smtpHost:   'smtp.test.com',
    smtpPort:   587,
    smtpSecure: false,
    smtpUser:   'noreply@test.com',
    smtpPass:   'secret',
    frontendUrl: 'http://localhost:5173',
  },
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeTransporter() {
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'mock-id' });
  const transporter = { sendMail } as unknown as Transporter;
  return { transporter, sendMail };
}

const BASE_SOLICITUD = {
  empleadoNombre: 'Juan Pérez',
  fechaInicio:    '2025-09-01',
  fechaFin:       '2025-09-12',
  diasHabiles:    10,
  emailRRHH:      'rrhh@empresa.com',
};

const BASE_APROBACION = {
  empleadoNombre: 'Ana López',
  fechaInicio:    '2025-09-01',
  fechaFin:       '2025-09-12',
  emailRRHH:      'rrhh@empresa.com',
};

const BASE_RECHAZO = {
  empleadoNombre: 'Pedro Gómez',
  fechaInicio:    '2025-09-01',
  fechaFin:       '2025-09-12',
  motivoRechazo:  'Sin presupuesto disponible',
  emailRRHH:      'rrhh@empresa.com',
};

// ─── tests ───────────────────────────────────────────────────────────────────

describe('EmailService', () => {
  let sendMail: vi.Mock;
  let service:  EmailService;

  beforeEach(() => {
    const t = makeTransporter();
    sendMail = t.sendMail;
    service  = new EmailService(t.transporter);
  });

  // ── notificarSolicitudRRHH ──────────────────────────────────────────────

  describe('notificarSolicitudRRHH', () => {
    it('calls sendMail once with the correct recipient', async () => {
      await service.notificarSolicitudRRHH(BASE_SOLICITUD);
      expect(sendMail).toHaveBeenCalledOnce();
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'rrhh@empresa.com' }),
      );
    });

    it('includes the employee name and dates in the email body', async () => {
      await service.notificarSolicitudRRHH(BASE_SOLICITUD);
      const { html, subject } = sendMail.mock.calls[0][0] as { html: string; subject: string };
      expect(subject).toContain('Juan Pérez');
      expect(html).toContain('2025-09-01');
      expect(html).toContain('10');
    });

    it('escapes HTML in employee name to prevent XSS', async () => {
      await service.notificarSolicitudRRHH({
        ...BASE_SOLICITUD,
        empleadoNombre: '<script>alert(1)</script>',
      });
      const { html } = sendMail.mock.calls[0][0] as { html: string };
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('resolves without throwing when sendMail rejects', async () => {
      sendMail.mockRejectedValueOnce(new Error('SMTP down'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await expect(service.notificarSolicitudRRHH(BASE_SOLICITUD)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EmailService]'),
        expect.any(String),
      );
      warnSpy.mockRestore();
    });
  });

  // ── notificarAprobacion ─────────────────────────────────────────────────

  describe('notificarAprobacion', () => {
    it('calls sendMail once with the correct recipient', async () => {
      await service.notificarAprobacion(BASE_APROBACION);
      expect(sendMail).toHaveBeenCalledOnce();
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'rrhh@empresa.com' }),
      );
    });

    it('includes the employee name in the subject', async () => {
      await service.notificarAprobacion(BASE_APROBACION);
      const { subject } = sendMail.mock.calls[0][0] as { subject: string };
      expect(subject).toContain('Ana López');
    });

    it('escapes HTML in employee name', async () => {
      await service.notificarAprobacion({
        ...BASE_APROBACION,
        empleadoNombre: '<b>Bold Name</b>',
      });
      const { html } = sendMail.mock.calls[0][0] as { html: string };
      expect(html).not.toContain('<b>');
      expect(html).toContain('&lt;b&gt;');
    });

    it('resolves without throwing when sendMail rejects', async () => {
      sendMail.mockRejectedValueOnce(new Error('SMTP down'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await expect(service.notificarAprobacion(BASE_APROBACION)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ── notificarRechazo ────────────────────────────────────────────────────

  describe('notificarRechazo', () => {
    it('calls sendMail once with the correct recipient', async () => {
      await service.notificarRechazo(BASE_RECHAZO);
      expect(sendMail).toHaveBeenCalledOnce();
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'rrhh@empresa.com' }),
      );
    });

    it('includes the rejection reason in the email body', async () => {
      await service.notificarRechazo(BASE_RECHAZO);
      const { html } = sendMail.mock.calls[0][0] as { html: string };
      expect(html).toContain('Sin presupuesto disponible');
    });

    it('escapes HTML in motivoRechazo to prevent XSS', async () => {
      await service.notificarRechazo({
        ...BASE_RECHAZO,
        motivoRechazo: '<img src=x onerror=alert(1)>',
      });
      const { html } = sendMail.mock.calls[0][0] as { html: string };
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;img');
    });

    it('resolves without throwing when sendMail rejects', async () => {
      sendMail.mockRejectedValueOnce(new Error('SMTP down'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await expect(service.notificarRechazo(BASE_RECHAZO)).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
