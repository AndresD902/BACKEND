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
      cedula: 'ADMIN9001234561',
      email: 'admin1@empresa.com',
      password: 'tempPass123',
      rol: 'admin' as const,
    };

    const result = await registrarUsuario(payload);

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      payload,
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    expect(result).toEqual(fakeResponse);
  });

  it('retorna los datos de la respuesta directamente', async () => {
    const fakeData = { id: 'new-user', rol: 'rrhh' };
    mockedAxios.post = vi.fn().mockResolvedValue({ data: fakeData });

    const result = await registrarUsuario({
      cedula: 'CC123456',
      email: 'rrhh@empresa.com',
      password: 'pass',
      rol: 'rrhh',
    });

    expect(result).toEqual(fakeData);
  });

  it('lanza si axios.post falla (auth service caído)', async () => {
    mockedAxios.post = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      registrarUsuario({
        cedula: 'CC999',
        email: 'test@test.com',
        password: 'pass',
        rol: 'consulta',
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
        cedula: 'CC001',
        email: 'duplicado@empresa.com',
        password: 'pass',
        rol: 'admin',
      }),
    ).rejects.toThrow();
  });
});
