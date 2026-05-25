import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../../src/config/database', () => ({
  pool: { query: mockQuery },
}));

import { historialCambiosRepository } from '../../../src/repositories/historialCambios.repository';
import type { CreateCambioData } from '../../../src/repositories/historialCambios.repository';

const BASE_CAMBIO = {
  id: 1,
  empleado_id: 10,
  entidad: 'empleado',
  entidad_id: null,
  campo_modificado: 'nombre',
  valor_anterior: 'Juan',
  valor_nuevo: 'Carlos',
  usuario_modificador: 'admin@test.com',
  rol_modificador: 'ADMIN',
  ip_origen: '127.0.0.1',
  fecha_modificacion: new Date('2026-01-01'),
};

beforeEach(() => vi.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────

describe('HistorialCambiosRepository.create', () => {
  it('inserts a record and returns the created row', async () => {
    mockQuery.mockResolvedValue({ rows: [BASE_CAMBIO] });

    const data: CreateCambioData = {
      empleado_id: 10,
      entidad: 'empleado',
      campo_modificado: 'nombre',
      valor_anterior: 'Juan',
      valor_nuevo: 'Carlos',
      usuario_modificador: 'admin@test.com',
      rol_modificador: 'ADMIN',
      ip_origen: '127.0.0.1',
    };

    const result = await historialCambiosRepository.create(data);

    expect(result).toEqual(BASE_CAMBIO);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('uses null for optional fields when they are undefined', async () => {
    mockQuery.mockResolvedValue({ rows: [{ ...BASE_CAMBIO, entidad_id: null, valor_anterior: null }] });

    await historialCambiosRepository.create({
      empleado_id: 10,
      entidad: 'empleado',
      campo_modificado: 'nombre',
      usuario_modificador: 'admin@test.com',
    });

    const calledValues = mockQuery.mock.calls[0][1];
    expect(calledValues).toEqual([
      10,
      null,
      'empleado',
      null,
      'nombre',
      null,
      null,
      'admin@test.com',
      null,
      null,
      null,
    ]);
  });
});

// ── findByEmpleado ────────────────────────────────────────────────────────────

describe('HistorialCambiosRepository.findByEmpleado', () => {
  it('queries with only empleado_id when no filters are set', async () => {
    mockQuery.mockResolvedValue({ rows: [BASE_CAMBIO] });

    const result = await historialCambiosRepository.findByEmpleado(10, {});

    expect(result).toEqual([BASE_CAMBIO]);
    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('empleado_id = $1');
    expect(values[0]).toBe(10);
  });

  it('adds entidad condition when filter is provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findByEmpleado(10, { entidad: 'empleado' });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('entidad = $2');
  });

  it('adds entidad_id condition when filter is provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findByEmpleado(10, { entidad_id: 5 });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('entidad_id =');
    expect(values).toContain(5);
  });

  it('adds desde condition when filter is provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findByEmpleado(10, { desde: '2026-01-01' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('fecha_modificacion >=');
    expect(values).toContain('2026-01-01');
  });

  it('adds hasta condition when filter is provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findByEmpleado(10, { hasta: '2026-12-31' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('fecha_modificacion <=');
    expect(values).toContain('2026-12-31');
  });

  it('applies all filters simultaneously', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findByEmpleado(10, {
      entidad: 'empleado',
      entidad_id: 5,
      desde: '2026-01-01',
      hasta: '2026-12-31',
      limit: 10,
      offset: 20,
    });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('entidad = ');
    expect(sql).toContain('entidad_id = ');
    expect(sql).toContain('fecha_modificacion >=');
    expect(sql).toContain('fecha_modificacion <=');
    expect(values).toContain(10);
    expect(values).toContain(20);
  });
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe('HistorialCambiosRepository.findAll', () => {
  it('queries without WHERE clause when no filters are set', async () => {
    mockQuery.mockResolvedValue({ rows: [BASE_CAMBIO] });

    const result = await historialCambiosRepository.findAll({});

    expect(result).toEqual([BASE_CAMBIO]);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toContain('WHERE');
  });

  it('adds WHERE clause when empleado_id filter is provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findAll({ empleado_id: 10 });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('WHERE');
    expect(sql).toContain('empleado_id =');
    expect(values).toContain(10);
  });

  it('adds entidad filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findAll({ entidad: 'contrato' });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('entidad =');
  });

  it('adds desde and hasta filters when both are provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findAll({ desde: '2026-01-01', hasta: '2026-06-30' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('fecha_modificacion >=');
    expect(sql).toContain('fecha_modificacion <=');
    expect(values).toContain('2026-01-01');
    expect(values).toContain('2026-06-30');
  });

  it('applies all filters simultaneously', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await historialCambiosRepository.findAll({
      empleado_id: 1,
      entidad: 'empleado',
      entidad_id: 3,
      desde: '2026-01-01',
      hasta: '2026-12-31',
      limit: 5,
      offset: 10,
    });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('WHERE');
    expect(values).toContain(1);
    expect(values).toContain('empleado');
    expect(values).toContain(3);
    expect(values).toContain(5);
    expect(values).toContain(10);
  });
});

// ── countByEmpleado ───────────────────────────────────────────────────────────

describe('HistorialCambiosRepository.countByEmpleado', () => {
  it('returns the parsed integer count', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });

    const result = await historialCambiosRepository.countByEmpleado(10, {});

    expect(result).toBe(42);
  });

  it('adds entidad filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

    await historialCambiosRepository.countByEmpleado(10, { entidad: 'cargo' });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('entidad =');
  });

  it('adds entidad_id filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });

    await historialCambiosRepository.countByEmpleado(10, { entidad_id: 7 });

    const [, values] = mockQuery.mock.calls[0];
    expect(values).toContain(7);
  });

  it('adds desde and hasta filters when both are provided', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '3' }] });

    await historialCambiosRepository.countByEmpleado(10, {
      desde: '2026-01-01',
      hasta: '2026-06-30',
    });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('fecha_modificacion >=');
    expect(sql).toContain('fecha_modificacion <=');
    expect(values).toContain('2026-01-01');
  });
});

// ── count ─────────────────────────────────────────────────────────────────────

describe('HistorialCambiosRepository.count', () => {
  it('returns the parsed integer count without filters', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '100' }] });

    const result = await historialCambiosRepository.count({});

    expect(result).toBe(100);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toContain('WHERE');
  });

  it('adds WHERE clause when empleado_id is provided', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '5' }] });

    await historialCambiosRepository.count({ empleado_id: 1 });

    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('WHERE');
    expect(sql).toContain('empleado_id =');
  });

  it('applies all available filters', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '2' }] });

    await historialCambiosRepository.count({
      empleado_id: 1,
      entidad: 'empleado',
      entidad_id: 2,
      desde: '2026-01-01',
      hasta: '2026-12-31',
    });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('WHERE');
    expect(values).toContain(1);
    expect(values).toContain('empleado');
    expect(values).toContain(2);
  });
});
