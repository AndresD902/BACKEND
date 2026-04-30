import axios from 'axios';
import { registrarCambio } from '../../../src/clients/historyServiceClient';

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('registrarCambio', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts the payload to the history service', async () => {
    mockAxios.post.mockResolvedValue({ data: {} });
    registrarCambio({
      empleado_id:         1,
      entidad:             'empleado',
      campo_modificado:    'nombre',
      usuario_modificador: 'admin@empresa.com',
      rol_modificador:     'ADMIN',
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/historial/cambios'),
      expect.objectContaining({ empleado_id: 1 }),
    );
  });

  it('includes optional fields when provided', async () => {
    mockAxios.post.mockResolvedValue({ data: {} });
    registrarCambio({
      empleado_id:         2,
      entidad:             'cargo_salario',
      entidad_id:          5,
      campo_modificado:    'salario',
      valor_anterior:      'Dev / 3000000',
      valor_nuevo:         'Tech Lead / 8000000',
      usuario_modificador: 'admin@empresa.com',
      rol_modificador:     'ADMIN',
    });
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ entidad_id: 5, valor_anterior: 'Dev / 3000000' }),
    );
  });

  it('does not throw when the history service is unreachable', async () => {
    mockAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(() =>
      registrarCambio({
        empleado_id:         1,
        entidad:             'empleado',
        campo_modificado:    'estado',
        usuario_modificador: 'admin@empresa.com',
        rol_modificador:     'ADMIN',
      }),
    ).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 10));
  });
});
