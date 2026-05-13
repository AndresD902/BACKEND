import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock('../../../src/config/database', () => ({
  pool: { query: mockQuery },
}));

import { accionesSistemaRepository } from '../../../src/repositories/accionesSistema.repository';
import type { CreateAccionData } from '../../../src/repositories/accionesSistema.repository';

const BASE_ACCION = {
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
  fecha: new Date('2026-01-01'),
};

beforeEach(() => vi.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────

describe('AccionesSistemaRepository.create', () => {
  it('inserts a record and returns the created row', async () => {
    mockQuery.mockResolvedValue({ rows: [BASE_ACCION] });

    const data: CreateAccionData = {
      usuario_email: 'admin@test.com',
      rol: 'ADMIN',
      accion: 'LOGIN',
      resultado: 'exitoso',
      ip_origen: '127.0.0.1',
    };

    const result = await accionesSistemaRepository.create(data);

    expect(result).toEqual(BASE_ACCION);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('defaults resultado to exitoso when not provided', async () => {
    mockQuery.mockResolvedValue({ rows: [BASE_ACCION] });

    await accionesSistemaRepository.create({ accion: 'EXPORT' });

    const calledValues = mockQuery.mock.calls[0][1];
    expect(calledValues[5]).toBe('exitoso');
  });

  it('uses null for all optional fields when they are undefined', async () => {
    mockQuery.mockResolvedValue({ rows: [BASE_ACCION] });

    await accionesSistemaRepository.create({ accion: 'EXPORT' });

    const calledValues = mockQuery.mock.calls[0][1];
    expect(calledValues[0]).toBeNull();
    expect(calledValues[1]).toBeNull();
    expect(calledValues[3]).toBeNull();
    expect(calledValues[4]).toBeNull();
    expect(calledValues[6]).toBeNull();
    expect(calledValues[7]).toBeNull();
    expect(calledValues[8]).toBeNull();
  });
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe('AccionesSistemaRepository.findAll', () => {
  it('queries without WHERE clause when no filters are set', async () => {
    mockQuery.mockResolvedValue({ rows: [BASE_ACCION] });

    const result = await accionesSistemaRepository.findAll({});

    expect(result).toEqual([BASE_ACCION]);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toContain('WHERE');
  });

  it('adds accion filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await accionesSistemaRepository.findAll({ accion: 'LOGIN' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('WHERE');
    expect(sql).toContain('accion =');
    expect(values).toContain('LOGIN');
  });

  it('adds resultado filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await accionesSistemaRepository.findAll({ resultado: 'fallido' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('resultado =');
    expect(values).toContain('fallido');
  });

  it('adds usuario_email filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await accionesSistemaRepository.findAll({ usuario_email: 'hr@test.com' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('usuario_email =');
    expect(values).toContain('hr@test.com');
  });

  it('adds desde filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await accionesSistemaRepository.findAll({ desde: '2026-01-01' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('fecha >=');
    expect(values).toContain('2026-01-01');
  });

  it('adds hasta filter when provided', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await accionesSistemaRepository.findAll({ hasta: '2026-12-31' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('fecha <=');
    expect(values).toContain('2026-12-31');
  });

  it('applies all filters simultaneously', async () => {
    mockQuery.mockResolvedValue({ rows: [] });

    await accionesSistemaRepository.findAll({
      accion: 'LOGIN',
      resultado: 'exitoso',
      usuario_email: 'admin@test.com',
      desde: '2026-01-01',
      hasta: '2026-12-31',
      limit: 10,
      offset: 5,
    });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('WHERE');
    expect(values).toContain('LOGIN');
    expect(values).toContain('exitoso');
    expect(values).toContain('admin@test.com');
    expect(values).toContain(10);
    expect(values).toContain(5);
  });
});

// ── count ─────────────────────────────────────────────────────────────────────

describe('AccionesSistemaRepository.count', () => {
  it('returns parsed integer count without filters', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '77' }] });

    const result = await accionesSistemaRepository.count({});

    expect(result).toBe(77);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toContain('WHERE');
  });

  it('adds WHERE clause with accion filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '3' }] });

    await accionesSistemaRepository.count({ accion: 'LOGOUT' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('WHERE');
    expect(values).toContain('LOGOUT');
  });

  it('adds resultado filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '1' }] });

    await accionesSistemaRepository.count({ resultado: 'denegado' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('resultado =');
    expect(values).toContain('denegado');
  });

  it('adds usuario_email filter', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '10' }] });

    await accionesSistemaRepository.count({ usuario_email: 'x@x.com' });

    const [, values] = mockQuery.mock.calls[0];
    expect(values).toContain('x@x.com');
  });

  it('adds desde and hasta date filters', async () => {
    mockQuery.mockResolvedValue({ rows: [{ count: '5' }] });

    await accionesSistemaRepository.count({ desde: '2026-01-01', hasta: '2026-06-30' });

    const [sql, values] = mockQuery.mock.calls[0];
    expect(sql).toContain('fecha >=');
    expect(sql).toContain('fecha <=');
    expect(values).toContain('2026-01-01');
    expect(values).toContain('2026-06-30');
  });
});
