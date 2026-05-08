import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/clients/historyClient', () => ({
  obtenerAcciones: vi.fn(),
  obtenerCambios: vi.fn(),
  registrarAccion: vi.fn(),
}));

import { obtenerAcciones, obtenerCambios } from '../../../src/clients/historyClient';
import { auditoriaService } from '../../../src/services/auditoria.service';

const mockObtenerAcciones = vi.mocked(obtenerAcciones);
const mockObtenerCambios = vi.mocked(obtenerCambios);

const TOKEN = 'Bearer test-token';

describe('auditoriaService.obtenerAcciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna data, total y generado_en cuando el historial responde', async () => {
    const fakeData = [{ id: 1, accion: 'login' }, { id: 2, accion: 'logout' }];
    mockObtenerAcciones.mockResolvedValue(fakeData);

    const result = await auditoriaService.obtenerAcciones(TOKEN, { page: '1' });

    expect(result.data).toEqual(fakeData);
    expect(result.total).toBe(2);
    expect(result.advertencias).toHaveLength(0);
    expect(typeof result.generado_en).toBe('string');
    expect(mockObtenerAcciones).toHaveBeenCalledWith(TOKEN, { page: '1' });
  });

  it('retorna array vacío y advertencia cuando el servicio de historial falla', async () => {
    mockObtenerAcciones.mockRejectedValue(new Error('connection refused'));

    const result = await auditoriaService.obtenerAcciones(TOKEN);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.advertencias).toHaveLength(1);
    expect(result.advertencias[0]).toContain('connection refused');
  });

  it('pasa los params al cliente de historial', async () => {
    mockObtenerAcciones.mockResolvedValue([]);

    await auditoriaService.obtenerAcciones(TOKEN, { empresa: '5', accion: 'login' });

    expect(mockObtenerAcciones).toHaveBeenCalledWith(TOKEN, { empresa: '5', accion: 'login' });
  });

  it('usa params vacíos por defecto', async () => {
    mockObtenerAcciones.mockResolvedValue([]);

    await auditoriaService.obtenerAcciones(TOKEN);

    expect(mockObtenerAcciones).toHaveBeenCalledWith(TOKEN, {});
  });
});

describe('auditoriaService.obtenerCambios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna data, total y generado_en cuando el historial responde', async () => {
    const fakeData = [{ id: 1, campo: 'salario', valor_nuevo: '5000000' }];
    mockObtenerCambios.mockResolvedValue(fakeData);

    const result = await auditoriaService.obtenerCambios(TOKEN, { tipo: 'empleado' });

    expect(result.data).toEqual(fakeData);
    expect(result.total).toBe(1);
    expect(result.advertencias).toHaveLength(0);
    expect(mockObtenerCambios).toHaveBeenCalledWith(TOKEN, { tipo: 'empleado' });
  });

  it('retorna array vacío y advertencia cuando el servicio de historial falla', async () => {
    mockObtenerCambios.mockRejectedValue(new Error('timeout'));

    const result = await auditoriaService.obtenerCambios(TOKEN);

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.advertencias).toHaveLength(1);
    expect(result.advertencias[0]).toContain('timeout');
  });

  it('incluye fecha generado_en en formato ISO', async () => {
    mockObtenerCambios.mockResolvedValue([]);

    const result = await auditoriaService.obtenerCambios(TOKEN);

    expect(() => new Date(result.generado_en)).not.toThrow();
    expect(new Date(result.generado_en).getTime()).not.toBeNaN();
  });
});
