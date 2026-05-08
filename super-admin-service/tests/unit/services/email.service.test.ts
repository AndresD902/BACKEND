import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Transporter } from 'nodemailer';
import { EmailService } from '../../../src/services/email.service';

function makeTransporter() {
  const sendMail = vi.fn().mockResolvedValue({ messageId: 'msg-id-test' });
  const transporter = { sendMail } as unknown as Transporter;
  return { transporter, sendMail };
}

describe('EmailService.enviarCredencialesAdmin', () => {
  let service: EmailService;
  let sendMail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = makeTransporter();
    service = new EmailService(mock.transporter);
    sendMail = mock.sendMail;
  });

  it('envía el correo con el destinatario y asunto correctos', async () => {
    await service.enviarCredencialesAdmin({
      to: 'empresa@test.com',
      adminEmail: 'admin1@empresa.com',
      passwordTemporal: 'abc123',
      nombreEmpresa: 'Empresa Test',
    });

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'empresa@test.com',
        subject: expect.stringContaining('Empresa Test'),
      }),
    );
  });

  it('escapa caracteres HTML en nombreEmpresa para prevenir XSS', async () => {
    await service.enviarCredencialesAdmin({
      to: 'victima@test.com',
      adminEmail: 'a@b.com',
      passwordTemporal: 'pass',
      nombreEmpresa: '<script>alert("xss")</script>',
    });

    const { html } = sendMail.mock.calls[0][0] as { html: string };
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapa caracteres HTML en adminEmail', async () => {
    await service.enviarCredencialesAdmin({
      to: 'to@test.com',
      adminEmail: '<img onerror="xss">',
      passwordTemporal: 'pass',
      nombreEmpresa: 'Empresa',
    });

    const { html } = sendMail.mock.calls[0][0] as { html: string };
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('no lanza si sendMail falla (SMTP caído)', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      service.enviarCredencialesAdmin({
        to: 'a@b.com',
        adminEmail: 'admin@empresa.com',
        passwordTemporal: 'pass',
        nombreEmpresa: 'Empresa',
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EmailService]'),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });
});

describe('EmailService.enviarRecuperacionContrasena', () => {
  let service: EmailService;
  let sendMail: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mock = makeTransporter();
    service = new EmailService(mock.transporter);
    sendMail = mock.sendMail;
  });

  it('envía el correo al destinatario correcto', async () => {
    await service.enviarRecuperacionContrasena({
      to: 'superadmin@test.com',
      nombre: 'Carlos López',
      resetToken: 'reset-token-abc',
    });

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'superadmin@test.com',
        subject: expect.stringContaining('Recuperación'),
      }),
    );
  });

  it('incluye el enlace de reset en el HTML', async () => {
    await service.enviarRecuperacionContrasena({
      to: 'admin@test.com',
      nombre: 'Admin',
      resetToken: 'token-reset-123',
    });

    const { html } = sendMail.mock.calls[0][0] as { html: string };
    expect(html).toContain('reset-password');
    expect(html).toContain('token-reset-123');
  });

  it('escapa el nombre para prevenir XSS', async () => {
    await service.enviarRecuperacionContrasena({
      to: 'a@b.com',
      nombre: '<script>alert(1)</script>',
      resetToken: 'token',
    });

    const { html } = sendMail.mock.calls[0][0] as { html: string };
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('no lanza si sendMail falla', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      service.enviarRecuperacionContrasena({
        to: 'a@b.com',
        nombre: 'Admin',
        resetToken: 'token',
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EmailService]'),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });
});
