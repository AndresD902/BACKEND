import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHistorialRepo = vi.hoisted(() => ({
  create:           vi.fn(),
  findByEmpleado:   vi.fn(),
  findAll:          vi.fn(),
  countByEmpleado:  vi.fn(),
  count:            vi.fn(),
}));

const mockAccionesRepo = vi.hoisted(() => ({
  create:  vi.fn(),
  findAll: vi.fn(),
  count:   vi.fn(),
}));

vi.mock('../../../src/repositories/historialCambios.repository', () => ({
  historialCambiosRepository: mockHistorialRepo,
}));

vi.mock('../../../src/repositories/accionesSistema.repository', () => ({
  accionesSistemaRepository: mockAccionesRepo,
}));

import { historyService } from '../../../src/services/history.service';

const CAMBIO = {
  id: 1,
  empleado_id: 5,
  entidad: 'empleado',
  entidad_id: null,
  campo_modificado: 'nombre',
  valor_anterior: 'Juan',
  valor_nuevo: 'Carlos',
  usuario_modificador: 'admin@test.com',
  rol_modificador: 'ADMIN',
  ip_origen: '127.0.0.1',
  fecha_modificacion: new Date(),
};

const ACCION = {
  id: 1,
  usuario_email: 'admin@test.com',
  rol: 'ADMIN',
  accion: 'LOGIN',
  entidad: null,
  entidad_id: null,
  resultado: 'exitoso' as const,
  detalle: null,
  ip_origen: '127.0.0.1',
  user_agent: null,
  fecha: new Date(),
};

beforeEach(() => vi.clearAllMocks());

// ── registrarCambio ───────────────────────────────────────────────────────────

describe('historyService.registrarCambio', () => {
  it('delegates to historialCambiosRepository.create and returns the result', async () => {
    mockHistorialRepo.create.mockResolvedValue(CAMBIO);

    const result = await historyService.registrarCambio({
      empleado_id: 5,
      entidad: 'empleado',
      campo_modificado: 'nombre',
      usuario_modificador: 'admin@test.com',
    });

    expect(result).toEqual(CAMBIO);
    expect(mockHistorialRepo.create).toHaveBeenCalledTimes(1);
  });
});

// ── registrarAccion ───────────────────────────────────────────────────────────

describe('historyService.registrarAccion', () => {
  it('delegates to accionesSistemaRepository.create and returns the result', async () => {
    mockAccionesRepo.create.mockResolvedValue(ACCION);

    const result = await historyService.registrarAccion({ accion: 'LOGIN' });

    expect(result).toEqual(ACCION);
    expect(mockAccionesRepo.create).toHaveBeenCalledWith({ accion: 'LOGIN' });
  });
});

// ── getCambiosPorEmpleado ─────────────────────────────────────────────────────

describe('historyService.getCambiosPorEmpleado', () => {
  it('runs findByEmpleado and countByEmpleado in parallel and returns combined result', async () => {
    mockHistorialRepo.findByEmpleado.mockResolvedValue([CAMBIO]);
    mockHistorialRepo.countByEmpleado.mockResolvedValue(1);

    const result = await historyService.getCambiosPorEmpleado(5, { limit: 10, offset: 0 });

    expect(result).toEqual({ cambios: [CAMBIO], total: 1 });
    expect(mockHistorialRepo.findByEmpleado).toHaveBeenCalledWith(5, { limit: 10, offset: 0 });
    expect(mockHistorialRepo.countByEmpleado).toHaveBeenCalledWith(5, { limit: 10, offset: 0 });
  });

  it('forwards the empleadoId and all filters to both repository methods', async () => {
    mockHistorialRepo.findByEmpleado.mockResolvedValue([]);
    mockHistorialRepo.countByEmpleado.mockResolvedValue(0);

    const filtros = { entidad: 'contrato', desde: '2026-01-01', limit: 5, offset: 10 };
    await historyService.getCambiosPorEmpleado(99, filtros);

    expect(mockHistorialRepo.findByEmpleado).toHaveBeenCalledWith(99, filtros);
    expect(mockHistorialRepo.countByEmpleado).toHaveBeenCalledWith(99, filtros);
  });
});

// ── getCambios ────────────────────────────────────────────────────────────────

describe('historyService.getCambios', () => {
  it('runs findAll and count in parallel and returns combined result', async () => {
    mockHistorialRepo.findAll.mockResolvedValue([CAMBIO]);
    mockHistorialRepo.count.mockResolvedValue(1);

    const result = await historyService.getCambios({ limit: 20, offset: 0 });

    expect(result).toEqual({ cambios: [CAMBIO], total: 1 });
  });

  it('forwards filters to both repository methods', async () => {
    mockHistorialRepo.findAll.mockResolvedValue([]);
    mockHistorialRepo.count.mockResolvedValue(0);

    const filtros = { empleado_id: 3, entidad: 'cargo', limit: 50, offset: 0 };
    await historyService.getCambios(filtros);

    expect(mockHistorialRepo.findAll).toHaveBeenCalledWith(filtros);
    expect(mockHistorialRepo.count).toHaveBeenCalledWith(filtros);
  });

  it('returns empty array and zero total when there are no records', async () => {
    mockHistorialRepo.findAll.mockResolvedValue([]);
    mockHistorialRepo.count.mockResolvedValue(0);

    const result = await historyService.getCambios({});

    expect(result).toEqual({ cambios: [], total: 0 });
  });
});

// ── getAcciones ───────────────────────────────────────────────────────────────

describe('historyService.getAcciones', () => {
  it('runs findAll and count in parallel and returns combined result', async () => {
    mockAccionesRepo.findAll.mockResolvedValue([ACCION]);
    mockAccionesRepo.count.mockResolvedValue(1);

    const result = await historyService.getAcciones({ limit: 10, offset: 0 });

    expect(result).toEqual({ acciones: [ACCION], total: 1 });
  });

  it('forwards filters to both repository methods', async () => {
    mockAccionesRepo.findAll.mockResolvedValue([]);
    mockAccionesRepo.count.mockResolvedValue(0);

    const filtros = { accion: 'LOGIN', resultado: 'fallido', limit: 10, offset: 0 };
    await historyService.getAcciones(filtros);

    expect(mockAccionesRepo.findAll).toHaveBeenCalledWith(filtros);
    expect(mockAccionesRepo.count).toHaveBeenCalledWith(filtros);
  });

  it('returns empty acciones array and zero total when there are no records', async () => {
    mockAccionesRepo.findAll.mockResolvedValue([]);
    mockAccionesRepo.count.mockResolvedValue(0);

    const result = await historyService.getAcciones({});

    expect(result).toEqual({ acciones: [], total: 0 });
  });
});
