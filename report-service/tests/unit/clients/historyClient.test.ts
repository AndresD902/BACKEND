import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { registrarAccion } from '../../../src/clients/historyClient';

vi.mock('axios');
vi.mock('../../../src/config/env', () => ({
  env: {
    historyServiceUrl: 'http://localhost:3006',
    internalApiKey: 'test-internal-key',
  },
}));

// ─── registrarAccion (fire-and-forget) ────────────────────────────────────────

describe('registrarAccion', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts the action payload to the history service endpoint', () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} });

    registrarAccion({
      accion:    'reporte_generado',
      resultado: 'exitoso',
      detalle:   'empleado:1',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3006/api/historial/acciones',
      expect.objectContaining({ accion: 'reporte_generado', resultado: 'exitoso' }),
      {
        timeout: 3000,
        headers: { 'x-internal-key': 'test-internal-key' },
      },
    );
  });

  it('includes optional fields when provided', () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} });

    registrarAccion({
      usuario_email: 'admin@empresa.com',
      rol:           'ADMIN',
      accion:        'test',
      ip_origen:     '127.0.0.1',
      user_agent:    'Mozilla/5.0',
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        usuario_email: 'admin@empresa.com',
        rol:           'ADMIN',
        ip_origen:     '127.0.0.1',
      }),
      expect.any(Object),
    );
  });

  it('does not throw when axios.post rejects (fire-and-forget)', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('History down'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => registrarAccion({ accion: 'test' })).not.toThrow();

    await new Promise(resolve => setTimeout(resolve, 0));
    warnSpy.mockRestore();
  });

  it('logs a warning with the [HistoryClient] prefix when the POST fails', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Connection refused'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registrarAccion({ accion: 'test' });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[HistoryClient]'),
      expect.stringContaining('Connection refused'),
    );
    warnSpy.mockRestore();
  });
});
