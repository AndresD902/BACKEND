import axios from 'axios';
import { registrarCambio, CambioPayload } from '../../src/clients/historyServiceClient';

jest.mock('axios');

const mockPost = axios.post as jest.Mock;

const payload: CambioPayload = {
  empleado_id: 1,
  entidad: 'empleados',
  campo_modificado: 'status',
  usuario_modificador: 'admin-id',
  rol_modificador: 'ADMIN',
};

describe('historyServiceClient — registrarCambio', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should post the change payload to the history service', () => {
    mockPost.mockResolvedValue({ data: {} });
    registrarCambio(payload);
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('/api/historial/cambios'),
      payload,
    );
  });

  it('should not throw when the history service is unreachable', () => {
    mockPost.mockReturnValue(Promise.reject(new Error('ECONNREFUSED')));
    expect(() => registrarCambio(payload)).not.toThrow();
  });

  it('should include optional fields when provided', () => {
    mockPost.mockResolvedValue({});
    registrarCambio({
      ...payload,
      entidad_id: 5,
      valor_anterior: 'ACTIVE',
      valor_nuevo: 'INACTIVE',
      ip_origen: '127.0.0.1',
    });
    expect(mockPost).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ valor_anterior: 'ACTIVE', valor_nuevo: 'INACTIVE' }),
    );
  });
});
