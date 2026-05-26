import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

import { getEmpleadosPorEmpresa } from '../../../src/clients/employeeClient';

describe('getEmpleadosPorEmpresa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the internal employee endpoint with the internal API key', async () => {
    const fakeEmpleados = [{ id: 1, nombre: 'Juan' }, { id: 2, nombre: 'Ana' }];
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { data: fakeEmpleados } });

    const result = await getEmpleadosPorEmpresa(15);

    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/internal/empresas/15/empleados'),
      expect.objectContaining({
        headers: { 'x-internal-key': expect.any(String) },
        timeout: expect.any(Number),
      }),
    );
    expect(result).toEqual(fakeEmpleados);
  });

  it('returns an empty array when data.data is undefined', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({ data: {} });

    const result = await getEmpleadosPorEmpresa(15);

    expect(result).toEqual([]);
  });

  it('throws when axios.get fails', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('timeout'));

    await expect(getEmpleadosPorEmpresa(15)).rejects.toThrow('timeout');
  });
});
