const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  pool: {
    connect: jest.fn(() => Promise.resolve(mockClient)),
    query: jest.fn(),
  },
}));

import { ContractRepository } from '../../src/repositories/contract.repository';
import { ContractStatus } from '../../src/shared/enums/contract-status.enum';
import { ContractType } from '../../src/shared/enums/contract-type.enum';
import { PaymentFrequency } from '../../src/shared/enums/payment-frequency.enum';
import { PaymentMethod } from '../../src/shared/enums/payment-method.enum';
import { WorkMode } from '../../src/shared/enums/work-mode.enum';
import { WorkSchedule } from '../../src/shared/enums/work-schedule.enum';

const { pool } = jest.requireMock('../../src/config/database') as {
  pool: {
    connect: jest.Mock;
    query: jest.Mock;
  };
};

function contractRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    empleado_id: '7',
    tipo: 'fijo',
    salario: '5000000.00',
    moneda: 'COP',
    fecha_inicio: new Date('2026-01-01T00:00:00.000Z'),
    fecha_fin: new Date('2026-12-31T00:00:00.000Z'),
    metodo_pago: 'transferencia',
    periodicidad_pago: 'mensual',
    lugar_trabajo: 'Bogota',
    modalidad: 'hibrido',
    jornada: 'completa',
    archivo_s3_key: null,
    archivo_s3_url: null,
    estado: ContractStatus.ACTIVE,
    creado_por: 'admin@example.com',
    fecha_creacion: new Date(),
    fecha_actualizacion: new Date(),
    ...overrides,
  };
}

const baseCreateDto = {
  employeeId: 7,
  type: ContractType.FIXED_TERM,
  salary: 5000000,
  currency: 'COP',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  paymentMethod: PaymentMethod.BANK_TRANSFER,
  paymentFrequency: PaymentFrequency.MONTHLY,
  workplace: 'Bogota',
  workMode: WorkMode.HYBRID,
  workSchedule: WorkSchedule.FULL_TIME,
  fileS3Key: null,
  fileS3Url: null,
  status: ContractStatus.ACTIVE,
  createdBy: 'admin@example.com',
};

describe('ContractRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  it('creates a contract and returns the mapped row', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [contractRow()] });

    const result = await repository.create(baseCreateDto);

    expect(result.id).toBe(1);
    expect(result.employeeId).toBe(7);
    expect(result.type).toBe('fijo');
    expect(String(pool.query.mock.calls[0][0])).toContain('INSERT INTO contratos');
    expect(pool.query.mock.calls[0][1]).toContain(7);
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  it('returns all contracts mapped from rows', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({
      rows: [contractRow({ id: '1' }), contractRow({ id: '2' })],
    });

    const result = await repository.findAll();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(String(pool.query.mock.calls[0][0])).toContain('SELECT');
    expect(String(pool.query.mock.calls[0][0])).toContain('ORDER BY fecha_creacion DESC');
  });

  it('returns empty array when no contracts exist', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.findAll();

    expect(result).toEqual([]);
  });

  // ── findById ──────────────────────────────────────────────────────────────

  it('returns mapped contract when found by id', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [contractRow()] });

    const result = await repository.findById(1);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(1);
    expect(pool.query.mock.calls[0][1]).toEqual([1]);
  });

  it('returns null when no contract found by id', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.findById(999);

    expect(result).toBeNull();
  });

  // ── findByEmployeeId ──────────────────────────────────────────────────────

  it('returns mapped contracts for employee id', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [contractRow(), contractRow({ id: '2' })] });

    const result = await repository.findByEmployeeId(7);

    expect(result).toHaveLength(2);
    expect(String(pool.query.mock.calls[0][0])).toContain('empleado_id = $1');
    expect(pool.query.mock.calls[0][1]).toEqual([7]);
  });

  it('returns empty array when no contracts for employee', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.findByEmployeeId(999);

    expect(result).toEqual([]);
  });

  // ── findActiveByEmployeeId ────────────────────────────────────────────────

  it('returns active contract for employee', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [contractRow()] });

    const result = await repository.findActiveByEmployeeId(7);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(ContractStatus.ACTIVE);
    expect(pool.query.mock.calls[0][1]).toEqual([7, ContractStatus.ACTIVE]);
  });

  it('returns null when no active contract for employee', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.findActiveByEmployeeId(999);

    expect(result).toBeNull();
  });

  // ── renewActiveContract ───────────────────────────────────────────────────

  it('renews in one transaction so the previous active contract is closed before inserting the new active one', async () => {
    const repository = new ContractRepository();

    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [contractRow({ id: '1', estado: ContractStatus.ACTIVE })] })
      .mockResolvedValueOnce({ rows: [contractRow({ id: '1', estado: ContractStatus.EXPIRED })] })
      .mockResolvedValueOnce({ rows: [contractRow({ id: '2', estado: ContractStatus.ACTIVE })] })
      .mockResolvedValueOnce(undefined);

    const result = await repository.renewActiveContract(
      baseCreateDto,
      ContractStatus.EXPIRED,
      '2026-12-31',
    );

    expect(result?.previousContract.status).toBe(ContractStatus.EXPIRED);
    expect(result?.contract.status).toBe(ContractStatus.ACTIVE);
    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(String(mockClient.query.mock.calls[1][0])).toContain('FOR UPDATE');
    expect(String(mockClient.query.mock.calls[2][0])).toContain('UPDATE contratos');
    expect(String(mockClient.query.mock.calls[3][0])).toContain('INSERT INTO contratos');
    expect(mockClient.query).toHaveBeenLastCalledWith('COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rolls back and returns null when no active contract exists for renewal', async () => {
    const repository = new ContractRepository();

    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(undefined);

    const result = await repository.renewActiveContract(
      { employeeId: 7, type: ContractType.FIXED_TERM, salary: 5800000, currency: 'COP',
        startDate: '2027-01-01', workMode: WorkMode.HYBRID, workSchedule: WorkSchedule.FULL_TIME,
        status: ContractStatus.ACTIVE },
      ContractStatus.EXPIRED,
      '2026-12-31',
    );

    expect(result).toBeNull();
    expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('rolls back and rethrows when an error occurs in the transaction', async () => {
    const repository = new ContractRepository();
    const dbError = new Error('Database error');

    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(dbError)
      .mockResolvedValueOnce(undefined);

    await expect(repository.renewActiveContract(
      baseCreateDto,
      ContractStatus.EXPIRED,
      '2026-12-31',
    )).rejects.toBe(dbError);

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  it('updates contract status and returns mapped result', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [contractRow({ estado: ContractStatus.EXPIRED })] });

    const result = await repository.updateStatus(1, ContractStatus.EXPIRED);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(ContractStatus.EXPIRED);
    expect(pool.query.mock.calls[0][1]).toEqual([1, ContractStatus.EXPIRED]);
  });

  it('returns null when no contract matched the status update', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.updateStatus(999, ContractStatus.EXPIRED);

    expect(result).toBeNull();
  });

  // ── applyAmendmentPatch ───────────────────────────────────────────────────

  it('applies whitelisted amendment fields to the contract', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({
      rows: [contractRow({ salario: '5800000.00', modalidad: WorkMode.REMOTE })],
    });

    const result = await repository.applyAmendmentPatch(7, {
      salary: 5800000,
      workMode: WorkMode.REMOTE,
    });

    expect(result?.salary).toBe('5800000.00');
    expect(result?.workMode).toBe(WorkMode.REMOTE);
    expect(String(pool.query.mock.calls[0][0])).toContain('"salario" = $1');
    expect(String(pool.query.mock.calls[0][0])).toContain('"modalidad" = $2');
    expect(pool.query.mock.calls[0][1]).toEqual([5800000, WorkMode.REMOTE, 7]);
  });

  it('returns null when amendment patch finds no matching contract', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.applyAmendmentPatch(999, { salary: 6000000 });

    expect(result).toBeNull();
  });

  it('calls findById when patch has no fields to update', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [contractRow()] });

    const result = await repository.applyAmendmentPatch(1, {});

    expect(result?.id).toBe(1);
    expect(String(pool.query.mock.calls[0][0])).toContain('SELECT');
  });

  it('applies all supported patch fields', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [contractRow()] });

    await repository.applyAmendmentPatch(1, {
      salary: 6000000,
      currency: 'USD',
      endDate: '2027-06-30',
      paymentMethod: 'efectivo',
      paymentFrequency: 'quincenal',
      workplace: 'Medellin',
      workMode: WorkMode.REMOTE,
      workSchedule: WorkSchedule.PART_TIME,
    });

    const query = String(pool.query.mock.calls[0][0]);
    expect(query).toContain('"salario"');
    expect(query).toContain('"moneda"');
    expect(query).toContain('"fecha_fin"');
    expect(query).toContain('"metodo_pago"');
    expect(query).toContain('"periodicidad_pago"');
    expect(query).toContain('"lugar_trabajo"');
    expect(query).toContain('"modalidad"');
    expect(query).toContain('"jornada"');
  });

  // ── expireEndedContracts ──────────────────────────────────────────────────

  it('expires ended active contracts and returns mapped results', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({
      rows: [contractRow({ id: '99', estado: ContractStatus.EXPIRED })],
    });

    const result = await repository.expireEndedContracts('2027-01-02');

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe(ContractStatus.EXPIRED);
    expect(String(pool.query.mock.calls[0][0])).toContain('UPDATE contratos');
    expect(pool.query.mock.calls[0][1]).toContain('2027-01-02');
  });

  it('returns empty array when no contracts expired', async () => {
    const repository = new ContractRepository();
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await repository.expireEndedContracts('2027-01-02');

    expect(result).toEqual([]);
  });
});
