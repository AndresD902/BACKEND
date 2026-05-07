import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
vi.mock('../../../src/config/env', () => ({
  env: { historyServiceUrl: 'http://history-service:3006' },
}));

const mockedAxios = vi.mocked(axios);

describe('historyServiceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to the history service with the given payload', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ status: 201 });

    const { registrarCambio } = await import('../../../src/clients/historyServiceClient');

    registrarCambio({
      empleado_id:         1,
      tipo_accion:         'solicitud_vacaciones',
      entidad:             'vacaciones',
      entidad_id:          10,
      campo_modificado:    'estado',
      valor_anterior:      null,
      valor_nuevo:         'pendiente',
      usuario_modificador: 'hr@empresa.com',
      rol_modificador:     'HR',
    });

    // fire-and-forget: wait for the post to be scheduled
    await new Promise(r => setImmediate(r));

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://history-service:3006/api/historial/cambios',
      expect.objectContaining({
        empleado_id:      1,
        tipo_accion:      'solicitud_vacaciones',
        entidad:          'vacaciones',
        campo_modificado: 'estado',
        valor_nuevo:      'pendiente',
      }),
      expect.objectContaining({ timeout: 3000 }),
    );
  });

  it('logs a warning and does not throw when the history service fails', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error('connection refused'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { registrarCambio } = await import('../../../src/clients/historyServiceClient');

    expect(() =>
      registrarCambio({
        empleado_id:         2,
        tipo_accion:         'aprobacion_vacaciones',
        entidad:             'vacaciones',
        campo_modificado:    'estado',
        valor_anterior:      'pendiente',
        valor_nuevo:         'aprobada',
        usuario_modificador: 'admin@empresa.com',
        rol_modificador:     'ADMIN',
      }),
    ).not.toThrow();

    await new Promise(r => setImmediate(r));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[HistoryService]'),
      expect.any(String),
    );

    warnSpy.mockRestore();
  });
});
