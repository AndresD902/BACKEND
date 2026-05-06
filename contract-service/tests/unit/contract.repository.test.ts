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

describe('ContractRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renews in one transaction so the previous active contract is closed before inserting the new active one', async () => {
    const repository = new ContractRepository();

    mockClient.query
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [contractRow({ id: '1', estado: ContractStatus.ACTIVE })] })
      .mockResolvedValueOnce({ rows: [contractRow({ id: '1', estado: ContractStatus.EXPIRED })] })
      .mockResolvedValueOnce({ rows: [contractRow({ id: '2', estado: ContractStatus.ACTIVE })] })
      .mockResolvedValueOnce(undefined);

    const result = await repository.renewActiveContract(
      {
        employeeId: 7,
        type: ContractType.FIXED_TERM,
        salary: 5800000,
        currency: 'COP',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentFrequency: PaymentFrequency.MONTHLY,
        workplace: 'Bogota',
        workMode: WorkMode.HYBRID,
        workSchedule: WorkSchedule.FULL_TIME,
        fileS3Key: null,
        fileS3Url: null,
        status: ContractStatus.ACTIVE,
        createdBy: 'admin@example.com',
      },
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
      {
        employeeId: 7,
        type: ContractType.FIXED_TERM,
        salary: 5800000,
        currency: 'COP',
        startDate: '2027-01-01',
        workMode: WorkMode.HYBRID,
        workSchedule: WorkSchedule.FULL_TIME,
        status: ContractStatus.ACTIVE,
      },
      ContractStatus.EXPIRED,
      '2026-12-31',
    );

    expect(result).toBeNull();
    expect(mockClient.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('applies whitelisted amendment fields to the contract', async () => {
    const repository = new ContractRepository();

    pool.query.mockResolvedValueOnce({
      rows: [
        contractRow({
          salario: '5800000.00',
          modalidad: WorkMode.REMOTE,
        }),
      ],
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
});
