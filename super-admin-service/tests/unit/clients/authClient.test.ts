import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

import { registrarUsuario } from '../../../src/clients/authClient';

describe('registrarUsuario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a axios.post con la URL del auth service y los datos del usuario', async () => {
    const fakeResponse = { id: 'auth-user-1', email: 'admin@empresa.com' };
    mockedAxios.post = vi.fn().mockResolvedValue({ data: fakeResponse });

    const payload = {
      firstName: 'Administrador',
      lastName: 'Empresa',
      email: 'admin1@empresa.com',
      password: 'tempPass123',
      role: 'ADMIN' as const,
      companyId: 1,
    };

    const result = await registrarUsuario(payload);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/internal/users'),
      payload,
      expect.objectContaining({
        timeout: expect.any(Number),
        headers: expect.objectContaining({ 'x-internal-key': expect.any(String) }),
      }),
    );
    expect(result).toEqual(fakeResponse);
  });

  it('retorna los datos de la respuesta directamente', async () => {
    const fakeData = { id: 'new-user', rol: 'rrhh' };
    mockedAxios.post = vi.fn().mockResolvedValue({ data: fakeData });

    const result = await registrarUsuario({
      firstName: 'Recursos',
      lastName: 'Humanos',
      email: 'rrhh@empresa.com',
      password: 'pass',
      role: 'HR',
      companyId: 1,
    });

    expect(result).toEqual(fakeData);
  });

  it('lanza si axios.post falla (auth service caído)', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      registrarUsuario({
        firstName: 'Consulta',
        lastName: 'Empleado',
        email: 'test@test.com',
        password: 'pass',
        role: 'CONSULTATION',
        companyId: 1,
        employeeId: 10,
      }),
    ).rejects.toThrow('ECONNREFUSED');
  });

  it('lanza si el auth service responde con error HTTP', async () => {
    const axiosError = Object.assign(new Error('Request failed with status code 409'), {
      response: { status: 409, data: { message: 'Email ya registrado' } },
    });
    mockedAxios.post = vi.fn().mockRejectedValue(axiosError);

    await expect(
      registrarUsuario({
        firstName: 'Duplicado',
        lastName: 'Empresa',
        email: 'duplicado@empresa.com',
        password: 'pass',
        role: 'ADMIN',
        companyId: 1,
      }),
    ).rejects.toThrow();
  });
});
