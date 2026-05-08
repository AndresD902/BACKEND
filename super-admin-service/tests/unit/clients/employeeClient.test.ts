import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

import { getEmpleados } from '../../../src/clients/employeeClient';

describe('getEmpleados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a axios.get con el token en el header Authorization', async () => {
    const fakeEmpleados = [{ id: 1, nombre: 'Juan' }, { id: 2, nombre: 'Ana' }];
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: fakeEmpleados } });

    const result = await getEmpleados('Bearer test-token');

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/empleados'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
        params: expect.objectContaining({ limit: 1000 }),
        timeout: expect.any(Number),
      }),
    );
    expect(result).toEqual(fakeEmpleados);
  });

  it('combina el parámetro limit=1000 con params adicionales', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: [] } });

    await getEmpleados('Bearer token', { estado: 'activo', page: '2' });

    const callParams = (mockedAxios.get as ReturnType<typeof vi.fn>).mock.calls[0][1].params;
    expect(callParams).toEqual({ limit: 1000, estado: 'activo', page: '2' });
  });

  it('los params adicionales pueden sobreescribir limit', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: [] } });

    await getEmpleados('Bearer token', { limit: 50 });

    const callParams = (mockedAxios.get as ReturnType<typeof vi.fn>).mock.calls[0][1].params;
    expect(callParams.limit).toBe(50);
  });

  it('retorna array vacío si data.data es undefined', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: {} });

    const result = await getEmpleados('Bearer token');

    expect(result).toEqual([]);
  });

  it('usa params vacíos por defecto cuando no se proveen', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: [] } });

    await getEmpleados('Bearer token');

    const callParams = (mockedAxios.get as ReturnType<typeof vi.fn>).mock.calls[0][1].params;
    expect(callParams).toEqual({ limit: 1000 });
  });

  it('lanza si axios.get falla (employee service caído)', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('timeout'));

    await expect(getEmpleados('Bearer token')).rejects.toThrow('timeout');
  });
});
