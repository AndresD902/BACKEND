import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

import { registrarAccion, obtenerAcciones, obtenerCambios } from '../../../src/clients/historyClient';

describe('registrarAccion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a axios.post con los datos de acción (fire-and-forget)', async () => {
    mockedAxios.post = vi.fn().mockResolvedValue({ status: 200 });

    registrarAccion({ accion: 'login', resultado: 'exitoso', usuario_email: 'a@b.com', rol: 'super_admin' });
    await new Promise((r) => setImmediate(r));

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/historial/acciones'),
      expect.objectContaining({ accion: 'login' }),
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it('no lanza si axios.post falla (fire-and-forget)', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error('timeout'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registrarAccion({ accion: 'login', resultado: 'fallido' });
    await new Promise((r) => setImmediate(r));

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[HistoryClient]'), expect.any(String));
    warnSpy.mockRestore();
  });
});

describe('obtenerAcciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna el array data de la respuesta', async () => {
    const fakeData = [{ id: 1, accion: 'login' }];
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: fakeData } });

    const result = await obtenerAcciones('Bearer token123', { page: '1' });

    expect(result).toEqual(fakeData);
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/historial/acciones'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token123' },
        params: { page: '1' },
      }),
    );
  });

  it('retorna array vacío si data.data es undefined', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: {} });

    const result = await obtenerAcciones('Bearer token', {});

    expect(result).toEqual([]);
  });

  it('lanza si axios.get falla', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('network error'));

    await expect(obtenerAcciones('Bearer token', {})).rejects.toThrow('network error');
  });
});

describe('obtenerCambios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna el array data de la respuesta', async () => {
    const fakeData = [{ id: 1, campo: 'salario' }];
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: fakeData } });

    const result = await obtenerCambios('Bearer token', { empresa: '1' });

    expect(result).toEqual(fakeData);
  });

  it('retorna array vacío si data.data es undefined', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: {} });

    const result = await obtenerCambios('Bearer token', {});

    expect(result).toEqual([]);
  });

  it('lanza si axios.get falla', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('timeout'));

    await expect(obtenerCambios('Bearer token', {})).rejects.toThrow('timeout');
  });
});
