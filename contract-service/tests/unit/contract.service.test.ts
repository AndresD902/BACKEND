import { ContractService } from '../../src/services/contract.service';
import { ContractStatus } from '../../src/shared/enums/contract-status.enum';
import { ContractType } from '../../src/shared/enums/contract-type.enum';
import { PaymentFrequency } from '../../src/shared/enums/payment-frequency.enum';
import { PaymentMethod } from '../../src/shared/enums/payment-method.enum';
import { WorkMode } from '../../src/shared/enums/work-mode.enum';
import { WorkSchedule } from '../../src/shared/enums/work-schedule.enum';
import { ConflictError } from '../../src/shared/errors/conflict.error';

jest.mock('../../src/clients/historyServiceClient', () => ({
  registrarCambio: jest.fn(),
  registrarAccion: jest.fn(),
}));

jest.mock('../../src/config/s3', () => ({
  assertContractObjectExists: jest.fn().mockResolvedValue(undefined),
  generateContractDownloadUrl: jest.fn().mockResolvedValue({ url: 'https://signed-download.test', expiresIn: 3600 }),
  generateContractUploadUrl: jest.fn().mockResolvedValue({ url: 'https://signed-upload.test', key: 'contratos/test.pdf', expiresIn: 300 }),
}));

const { registrarCambio } = jest.requireMock('../../src/clients/historyServiceClient') as {
  registrarCambio: jest.Mock;
};
const s3 = jest.requireMock('../../src/config/s3') as {
  assertContractObjectExists: jest.Mock;
};

function contract(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    employeeId: 22,
    type: 'fijo',
    salary: '5000000.00',
    currency: 'COP',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    paymentMethod: 'transferencia',
    paymentFrequency: 'mensual',
    workplace: 'Bogota',
    workMode: 'hibrido',
    workSchedule: 'completa',
    fileS3Key: 'contratos/test.pdf',
    fileS3URL: null,
    status: ContractStatus.ACTIVE,
    createdBy: 'admin@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function serviceFactory() {
  const repository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findById: jest.fn(),
    findByEmployeeId: jest.fn(),
    findActiveByEmployeeId: jest.fn(),
    renewActiveContract: jest.fn(),
    updateStatus: jest.fn(),
    applyAmendmentPatch: jest.fn(),
    expireEndedContracts: jest.fn(),
  };
  const amendmentRepository = {
    create: jest.fn(),
    findByContractId: jest.fn(),
    findNextAmendmentNumber: jest.fn(),
    findById: jest.fn(),
  };
  const employeeClient = {
    verifyEmployeeExists: jest.fn(),
  };
  const service = new ContractService(
    repository as never,
    amendmentRepository as never,
    employeeClient as never,
  );

  return {
    service,
    repository,
    amendmentRepository,
    employeeClient,
  };
}

describe('ContractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a contract only after employee and S3 file validation', async () => {
    const { service, repository, employeeClient } = serviceFactory();
    const createdContract = contract();

    repository.findActiveByEmployeeId.mockResolvedValue(null);
    repository.create.mockResolvedValue(createdContract);

    const result = await service.createContract(
      {
        employeeId: 22,
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
        fileS3Key: 'contratos/test.pdf',
        fileS3Url: 'https://public-url-should-not-be-stored.test',
        status: ContractStatus.ACTIVE,
      },
      'Bearer token',
      { email: 'admin@example.com', role: 'ADMIN' },
    );

    expect(result).toEqual(expect.objectContaining({
      id: createdContract.id,
      paymentDistribution: {
        baseMonthlySalary: 5000000,
        paymentFrequency: PaymentFrequency.MONTHLY,
        paymentsPerMonth: 1,
        amountPerPayment: 5000000,
      },
    }));
    expect(employeeClient.verifyEmployeeExists).toHaveBeenCalledWith(22, 'Bearer token');
    expect(s3.assertContractObjectExists).toHaveBeenCalledWith('contratos/test.pdf');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      fileS3Key: 'contratos/test.pdf',
      fileS3Url: null,
      createdBy: 'admin@example.com',
    }));
    expect(registrarCambio).toHaveBeenCalledWith(expect.objectContaining({
      empleado_id: 22,
      campo_modificado: 'contrato_creado',
    }));
  });

  it('rejects normal creation when the employee already has an active contract', async () => {
    const { service, repository } = serviceFactory();

    repository.findActiveByEmployeeId.mockResolvedValue(contract());

    await expect(service.createContract(
      {
        employeeId: 22,
        type: ContractType.FIXED_TERM,
        salary: 5000000,
        currency: 'COP',
        startDate: '2026-01-01',
        workMode: WorkMode.HYBRID,
        workSchedule: WorkSchedule.FULL_TIME,
        status: ContractStatus.ACTIVE,
      },
      'Bearer token',
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ConflictError);
  });

  it('renews by expiring the previous contract and creating a new active contract', async () => {
    const { service, repository } = serviceFactory();
    const previousContract = contract({ id: 10, status: ContractStatus.EXPIRED });
    const renewedContract = contract({ id: 11, status: ContractStatus.ACTIVE, startDate: new Date('2027-01-01T00:00:00.000Z') });

    repository.renewActiveContract.mockResolvedValue({
      previousContract,
      contract: renewedContract,
    });

    const result = await service.renewContract(
      {
        employeeId: 22,
        type: ContractType.FIXED_TERM,
        salary: 5800000,
        currency: 'COP',
        startDate: '2027-01-01',
        endDate: '2027-12-31',
        workMode: WorkMode.HYBRID,
        workSchedule: WorkSchedule.FULL_TIME,
        status: ContractStatus.ACTIVE,
      },
      'Bearer token',
      { email: 'admin@example.com', role: 'ADMIN' },
      { previousStatus: ContractStatus.EXPIRED },
    );

    expect(result.contract.id).toBe(11);
    expect(result.contract.paymentDistribution).toEqual({
      baseMonthlySalary: 5000000,
      paymentFrequency: PaymentFrequency.MONTHLY,
      paymentsPerMonth: 1,
      amountPerPayment: 5000000,
    });
    expect(repository.renewActiveContract).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 22,
        status: ContractStatus.ACTIVE,
        fileS3Url: null,
      }),
      ContractStatus.EXPIRED,
      '2026-12-31',
    );
    expect(registrarCambio).toHaveBeenCalledWith(expect.objectContaining({
      entidad_id: 10,
      campo_modificado: 'estado',
      valor_nuevo: ContractStatus.EXPIRED,
    }));
    expect(registrarCambio).toHaveBeenCalledWith(expect.objectContaining({
      entidad_id: 11,
      campo_modificado: 'contrato_renovado',
    }));
  });

  it('expires ended active contracts and writes audit records', async () => {
    const { service, repository } = serviceFactory();

    repository.expireEndedContracts.mockResolvedValue([
      contract({ id: 99, status: ContractStatus.EXPIRED }),
    ]);

    const expired = await service.expireEndedContracts('2027-01-02');

    expect(expired).toHaveLength(1);
    expect(repository.expireEndedContracts).toHaveBeenCalledWith('2027-01-02');
    expect(registrarCambio).toHaveBeenCalledWith(expect.objectContaining({
      entidad_id: 99,
      campo_modificado: 'estado',
      usuario_modificador: 'contract-service',
      rol_modificador: 'system',
    }));
  });

  it('creates an amendment and applies supported changes to the active contract', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();

    repository.findById.mockResolvedValue(contract({ id: 10, status: ContractStatus.ACTIVE }));
    repository.applyAmendmentPatch.mockResolvedValue(contract({
      id: 10,
      salary: '5500000.00',
      workMode: WorkMode.REMOTE,
    }));
    amendmentRepository.findNextAmendmentNumber.mockResolvedValue(1);
    amendmentRepository.create.mockResolvedValue({
      id: 5,
      contractId: 10,
      amendmentNumber: 1,
      description: 'Ajuste salarial y modalidad',
      changes: null,
      fileS3Key: null,
      fileS3Url: null,
      effectiveDate: new Date('2026-06-01T00:00:00.000Z'),
      createdBy: 'admin@example.com',
      createdAt: new Date(),
    });

    const result = await service.createContractAmendment(
      10,
      {
        description: 'Ajuste salarial y modalidad',
        changes: {
          salario: { before: 5000000, after: 5500000 },
          modalidad: { before: WorkMode.HYBRID, after: WorkMode.REMOTE },
        },
        effectiveDate: '2026-06-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    );

    expect(result.id).toBe(5);
    expect(repository.applyAmendmentPatch).toHaveBeenCalledWith(10, {
      salary: 5500000,
      workMode: WorkMode.REMOTE,
    });
    expect(registrarCambio).toHaveBeenCalledWith(expect.objectContaining({
      entidad_id: 10,
      campo_modificado: 'adenda_1',
    }));
  });
});
