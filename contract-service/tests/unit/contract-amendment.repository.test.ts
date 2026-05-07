jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
}));

import { ContractAmendmentRepository } from '../../src/repositories/contract-amendment.repository';

const { pool } = jest.requireMock('../../src/config/database') as {
  pool: {
    query: jest.Mock;
  };
};

function amendmentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '5',
    contrato_id: '10',
    numero_adenda: 2,
    descripcion: 'Cambio de salario',
    cambios_json: { salario: { before: 5000000, after: 5500000 } },
    archivo_s3_key: 'contratos/empleados/1/adendas/adenda.pdf',
    archivo_s3_url: null,
    fecha_vigencia: new Date('2026-06-01T00:00:00.000Z'),
    creado_por: 'admin@example.com',
    fecha_creacion: new Date('2026-05-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('ContractAmendmentRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an amendment serializing the change payload', async () => {
    const repository = new ContractAmendmentRepository();

    pool.query.mockResolvedValueOnce({ rows: [amendmentRow()] });

    const result = await repository.create(10, 2, {
      description: 'Cambio de salario',
      changes: { salario: { before: 5000000, after: 5500000 } },
      fileS3Key: 'contratos/empleados/1/adendas/adenda.pdf',
      fileS3Url: null,
      effectiveDate: '2026-06-01',
      createdBy: 'admin@example.com',
    });

    expect(result.id).toBe(5);
    expect(result.contractId).toBe(10);
    expect(pool.query.mock.calls[0][1]).toEqual([
      10,
      2,
      'Cambio de salario',
      JSON.stringify({ salario: { before: 5000000, after: 5500000 } }),
      'contratos/empleados/1/adendas/adenda.pdf',
      null,
      '2026-06-01',
      'admin@example.com',
    ]);
  });

  it('finds amendments ordered by amendment number', async () => {
    const repository = new ContractAmendmentRepository();

    pool.query.mockResolvedValueOnce({
      rows: [
        amendmentRow({ id: '5', numero_adenda: 1 }),
        amendmentRow({ id: '6', numero_adenda: 2 }),
      ],
    });

    const result = await repository.findByContractId(10);

    expect(result).toHaveLength(2);
    expect(result[0].amendmentNumber).toBe(1);
    expect(String(pool.query.mock.calls[0][0])).toContain('ORDER BY numero_adenda ASC');
    expect(pool.query.mock.calls[0][1]).toEqual([10]);
  });

  it('calculates the next amendment number', async () => {
    const repository = new ContractAmendmentRepository();

    pool.query.mockResolvedValueOnce({ rows: [{ next_number: '4' }] });

    const result = await repository.findNextAmendmentNumber(10);

    expect(result).toBe(4);
    expect(pool.query.mock.calls[0][1]).toEqual([10]);
  });

  it('returns null when an amendment id does not exist', async () => {
    const repository = new ContractAmendmentRepository();

    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.findById(999);

    expect(result).toBeNull();
  });

  it('returns the mapped amendment when found by id', async () => {
    const repository = new ContractAmendmentRepository();

    pool.query.mockResolvedValueOnce({ rows: [amendmentRow()] });

    const result = await repository.findById(5);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(5);
    expect(result?.contractId).toBe(10);
    expect(result?.description).toBe('Cambio de salario');
    expect(pool.query.mock.calls[0][1]).toEqual([5]);
  });
});
