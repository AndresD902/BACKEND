import { ContractService } from '../../src/services/contract.service';
import { ContractStatus } from '../../src/shared/enums/contract-status.enum';
import { ContractType } from '../../src/shared/enums/contract-type.enum';
import { PaymentFrequency } from '../../src/shared/enums/payment-frequency.enum';
import { PaymentMethod } from '../../src/shared/enums/payment-method.enum';
import { WorkMode } from '../../src/shared/enums/work-mode.enum';
import { WorkSchedule } from '../../src/shared/enums/work-schedule.enum';
import { ConflictError } from '../../src/shared/errors/conflict.error';
import { NotFoundError } from '../../src/shared/errors/not-found.error';
import { ValidationError } from '../../src/shared/errors/validation.error';

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
    listAccessibleEmployeeIds: jest.fn(),
  };
  const service = new ContractService(
    repository as never,
    amendmentRepository as never,
    employeeClient as never,
  );

  return { service, repository, amendmentRepository, employeeClient };
}

describe('ContractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createContract ────────────────────────────────────────────────────────

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

  // ── renewContract ─────────────────────────────────────────────────────────

  it('renews by expiring the previous contract and creating a new active contract', async () => {
    const { service, repository } = serviceFactory();
    const previousContract = contract({ id: 10, status: ContractStatus.EXPIRED });
    const renewedContract = contract({ id: 11, status: ContractStatus.ACTIVE, startDate: new Date('2027-01-01T00:00:00.000Z') });

    repository.renewActiveContract.mockResolvedValue({ previousContract, contract: renewedContract });

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
      expect.objectContaining({ employeeId: 22, status: ContractStatus.ACTIVE, fileS3Url: null }),
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

  it('throws NotFoundError when renew finds no active contract', async () => {
    const { service, repository } = serviceFactory();

    repository.renewActiveContract.mockResolvedValue(null);

    await expect(service.renewContract(
      {
        employeeId: 22,
        type: ContractType.FIXED_TERM,
        salary: 5000000,
        currency: 'COP',
        startDate: '2027-01-01',
        workMode: WorkMode.HYBRID,
        workSchedule: WorkSchedule.FULL_TIME,
        status: ContractStatus.ACTIVE,
      },
      'Bearer token',
      { email: 'admin@example.com', role: 'ADMIN' },
      {},
    )).rejects.toBeInstanceOf(NotFoundError);
  });

  it('uses provided previousEndDate instead of computing from startDate', async () => {
    const { service, repository } = serviceFactory();
    repository.renewActiveContract.mockResolvedValue({
      previousContract: contract({ id: 10, status: ContractStatus.EXPIRED }),
      contract: contract({ id: 11 }),
    });

    await service.renewContract(
      {
        employeeId: 22,
        type: ContractType.FIXED_TERM,
        salary: 5000000,
        currency: 'COP',
        startDate: '2027-01-01',
        workMode: WorkMode.HYBRID,
        workSchedule: WorkSchedule.FULL_TIME,
        status: ContractStatus.ACTIVE,
      },
      'Bearer token',
      { email: 'admin@example.com', role: 'ADMIN' },
      { previousEndDate: '2026-11-30' },
    );

    expect(repository.renewActiveContract).toHaveBeenCalledWith(
      expect.any(Object),
      ContractStatus.EXPIRED,
      '2026-11-30',
    );
  });

  // ── findAllContracts ──────────────────────────────────────────────────────

  it('returns all contracts with payment distribution', async () => {
    const { service, repository, employeeClient } = serviceFactory();
    repository.findAll.mockResolvedValue([contract(), contract({ id: 11 })]);
    employeeClient.listAccessibleEmployeeIds.mockResolvedValue([22]);

    const result = await service.findAllContracts('Bearer token');

    expect(result).toHaveLength(2);
    expect(result[0].paymentDistribution).toBeDefined();
    expect(repository.findAll).toHaveBeenCalled();
  });

  // ── findContractById ──────────────────────────────────────────────────────

  it('returns contract by id with payment distribution', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract());

    const result = await service.findContractById(10);

    expect(result.id).toBe(10);
    expect(result.paymentDistribution).toBeDefined();
    expect(repository.findById).toHaveBeenCalledWith(10);
  });

  it('throws NotFoundError when contract is not found by id', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(null);

    await expect(service.findContractById(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── findContractsByEmployeeId ─────────────────────────────────────────────

  it('returns contracts by employee id with payment distribution', async () => {
    const { service, repository } = serviceFactory();
    repository.findByEmployeeId.mockResolvedValue([contract()]);

    const result = await service.findContractsByEmployeeId(22);

    expect(result).toHaveLength(1);
    expect(result[0].paymentDistribution).toBeDefined();
    expect(repository.findByEmployeeId).toHaveBeenCalledWith(22);
  });

  // ── findActiveContractByEmployeeId ────────────────────────────────────────

  it('throws NotFoundError when no active contract exists for employee', async () => {
    const { service, repository } = serviceFactory();
    repository.findActiveByEmployeeId.mockResolvedValue(null);

    await expect(service.findActiveContractByEmployeeId(99)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns contract document view with null document when no fileS3Key', async () => {
    const { service, repository } = serviceFactory();
    repository.findActiveByEmployeeId.mockResolvedValue(contract({ fileS3Key: null }));

    const result = await service.findActiveContractByEmployeeId(22);

    expect(result.document).toBeNull();
    expect(result.contract).toBeDefined();
  });

  it('returns contract document view with signed URL when fileS3Key exists', async () => {
    const { service, repository } = serviceFactory();
    repository.findActiveByEmployeeId.mockResolvedValue(contract());

    const result = await service.findActiveContractByEmployeeId(22);

    expect(result.document).not.toBeNull();
    expect(result.document?.url).toBe('https://signed-download.test');
  });

  // ── updateContractStatus ──────────────────────────────────────────────────

  it('updates contract status and returns enriched result', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract());
    repository.updateStatus.mockResolvedValue(contract({ status: ContractStatus.EXPIRED }));

    const result = await service.updateContractStatus(
      10,
      { status: ContractStatus.EXPIRED },
      { email: 'admin@example.com', role: 'ADMIN' },
    );

    expect(result.status).toBe(ContractStatus.EXPIRED);
    expect(result.paymentDistribution).toBeDefined();
    expect(registrarCambio).toHaveBeenCalled();
  });

  it('throws NotFoundError when contract to update is not found', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(null);

    await expect(service.updateContractStatus(
      999,
      { status: ContractStatus.EXPIRED },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when updateStatus returns null', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract());
    repository.updateStatus.mockResolvedValue(null);

    await expect(service.updateContractStatus(
      10,
      { status: ContractStatus.EXPIRED },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── createContractAmendment ───────────────────────────────────────────────

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
      id: 5, contractId: 10, amendmentNumber: 1,
      description: 'Ajuste salarial y modalidad', changes: null,
      fileS3Key: null, fileS3Url: null,
      effectiveDate: new Date('2026-06-01T00:00:00.000Z'),
      createdBy: 'admin@example.com', createdAt: new Date(),
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

  it('throws NotFoundError when contract for amendment is not found', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(null);

    await expect(service.createContractAmendment(
      999,
      { description: 'Test', effectiveDate: '2026-06-01' },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when creating amendment on non-active contract', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.EXPIRED }));

    await expect(service.createContractAmendment(
      10,
      { description: 'Test', effectiveDate: '2026-06-01' },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ConflictError);
  });

  it('creates amendment with no contract patch when changes is null', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();

    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));
    amendmentRepository.findNextAmendmentNumber.mockResolvedValue(1);
    amendmentRepository.create.mockResolvedValue({
      id: 1, contractId: 10, amendmentNumber: 1,
      description: 'General amendment', changes: null,
      fileS3Key: null, fileS3Url: null,
      effectiveDate: new Date('2026-07-01'),
      createdBy: 'admin@example.com', createdAt: new Date(),
    });

    const result = await service.createContractAmendment(
      10,
      { description: 'General amendment', effectiveDate: '2026-07-01' },
      { email: 'admin@example.com', role: 'ADMIN' },
    );

    expect(result.id).toBe(1);
    expect(repository.applyAmendmentPatch).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when applyAmendmentPatch returns null', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();

    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));
    repository.applyAmendmentPatch.mockResolvedValue(null);
    amendmentRepository.findNextAmendmentNumber.mockResolvedValue(1);
    amendmentRepository.create.mockResolvedValue({
      id: 1, contractId: 10, amendmentNumber: 1,
      description: 'Patch', changes: null, fileS3Key: null, fileS3Url: null,
      effectiveDate: new Date(), createdBy: 'admin@example.com', createdAt: new Date(),
    });

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Salary bump',
        changes: { salario: { before: 5000000, after: 6000000 } },
        effectiveDate: '2026-08-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── findContractAmendments ────────────────────────────────────────────────

  it('returns contract amendments list', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract());
    amendmentRepository.findByContractId.mockResolvedValue([
      { id: 1, contractId: 10, amendmentNumber: 1 },
    ]);

    const result = await service.findContractAmendments(10);

    expect(result).toHaveLength(1);
    expect(amendmentRepository.findByContractId).toHaveBeenCalledWith(10);
  });

  it('throws NotFoundError when contract for amendments is not found', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(null);

    await expect(service.findContractAmendments(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── expireEndedContracts ──────────────────────────────────────────────────

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

  it('uses today as default reference date in expireEndedContracts', async () => {
    const { service, repository } = serviceFactory();
    repository.expireEndedContracts.mockResolvedValue([]);

    await service.expireEndedContracts();

    const today = new Date().toISOString().slice(0, 10);
    expect(repository.expireEndedContracts).toHaveBeenCalledWith(today);
  });

  // ── generateContractUploadUrl ─────────────────────────────────────────────

  it('generates contract upload URL after verifying employee', async () => {
    const { service, employeeClient } = serviceFactory();

    const result = await service.generateContractUploadUrl(
      { employeeId: 22, contentType: 'application/pdf' },
      'Bearer token',
    );

    expect(employeeClient.verifyEmployeeExists).toHaveBeenCalledWith(22, 'Bearer token');
    expect(result).toMatchObject({ url: 'https://signed-upload.test' });
  });

  // ── generateContractAmendmentUploadUrl ────────────────────────────────────

  it('generates amendment upload URL for active contract', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ id: 10, status: ContractStatus.ACTIVE }));

    const result = await service.generateContractAmendmentUploadUrl(10, { contentType: 'application/pdf' });

    expect(result).toMatchObject({ url: 'https://signed-upload.test' });
  });

  it('throws NotFoundError when contract for amendment upload not found', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(null);

    await expect(service.generateContractAmendmentUploadUrl(999, { contentType: 'application/pdf' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when contract for amendment upload is not active', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.EXPIRED }));

    await expect(service.generateContractAmendmentUploadUrl(10, { contentType: 'application/pdf' }))
      .rejects.toBeInstanceOf(ConflictError);
  });

  // ── generateContractDocumentUrl ───────────────────────────────────────────

  it('generates download URL for a contract document', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract());

    const result = await service.generateContractDocumentUrl(10);

    expect(result.key).toBe('contratos/test.pdf');
    expect(result.url).toBe('https://signed-download.test');
  });

  it('throws NotFoundError when contract for document URL not found', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(null);

    await expect(service.generateContractDocumentUrl(999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when contract has no fileS3Key for document URL', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ fileS3Key: null }));

    await expect(service.generateContractDocumentUrl(10)).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── generateContractAmendmentDocumentUrl ──────────────────────────────────

  it('generates download URL for a contract amendment document', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract());
    amendmentRepository.findById.mockResolvedValue({
      id: 1, contractId: 10, fileS3Key: 'adendas/amendment.pdf',
    });

    const result = await service.generateContractAmendmentDocumentUrl(10, 1);

    expect(result.key).toBe('adendas/amendment.pdf');
    expect(result.url).toBe('https://signed-download.test');
  });

  it('throws NotFoundError when contract for amendment document URL not found', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(null);

    await expect(service.generateContractAmendmentDocumentUrl(999, 1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when amendment not found or belongs to different contract', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract());
    amendmentRepository.findById.mockResolvedValue(null);

    await expect(service.generateContractAmendmentDocumentUrl(10, 999)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when amendment contractId does not match', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ id: 10 }));
    amendmentRepository.findById.mockResolvedValue({ id: 1, contractId: 999, fileS3Key: 'some.pdf' });

    await expect(service.generateContractAmendmentDocumentUrl(10, 1)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when amendment has no fileS3Key', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract());
    amendmentRepository.findById.mockResolvedValue({
      id: 1, contractId: 10, fileS3Key: null,
    });

    await expect(service.generateContractAmendmentDocumentUrl(10, 1)).rejects.toBeInstanceOf(NotFoundError);
  });

  // ── buildContractPatchFromAmendment edge cases ────────────────────────────

  it('handles amendment changes with all supported field aliases', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));
    repository.applyAmendmentPatch.mockResolvedValue(contract());
    amendmentRepository.findNextAmendmentNumber.mockResolvedValue(2);
    amendmentRepository.create.mockResolvedValue({
      id: 2, contractId: 10, amendmentNumber: 2,
      description: 'Full field update', changes: null,
      fileS3Key: null, fileS3Url: null,
      effectiveDate: new Date(), createdBy: 'admin@example.com', createdAt: new Date(),
    });

    await service.createContractAmendment(
      10,
      {
        description: 'Full field update',
        changes: {
          moneda: { before: 'COP', after: 'USD' },
          fecha_fin: { before: '2026-12-31', after: '2027-06-30' },
          metodo_pago: { before: 'transferencia', after: null },
          periodicidad_pago: { before: 'mensual', after: null },
          lugar_trabajo: { before: 'Bogota', after: null },
          jornada: { before: 'completa', after: 'medio_tiempo' },
          unknown_field: { before: 'x', after: 'y' },
          no_after: { before: 'x' },
        },
        effectiveDate: '2026-09-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    );

    expect(repository.applyAmendmentPatch).toHaveBeenCalledWith(10, expect.objectContaining({
      currency: 'USD',
      endDate: '2027-06-30',
    }));
  });

  it('throws ValidationError when amendment salary change is invalid', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Bad salary',
        changes: { salario: { before: 5000000, after: 'not-a-number' } },
        effectiveDate: '2026-06-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when amendment end date is before start date', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE, startDate: new Date('2026-06-01') }));
    amendmentRepository.findNextAmendmentNumber.mockResolvedValue(1);
    amendmentRepository.create.mockResolvedValue({
      id: 1, contractId: 10, amendmentNumber: 1,
      description: 'Bad date', changes: null,
      fileS3Key: null, fileS3Url: null,
      effectiveDate: new Date(), createdBy: 'admin@example.com', createdAt: new Date(),
    });

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Bad date',
        changes: { fecha_fin: { before: '2026-12-31', after: '2026-01-01' } },
        effectiveDate: '2026-09-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when amendment currency is too long', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));
    amendmentRepository.findNextAmendmentNumber.mockResolvedValue(1);
    amendmentRepository.create.mockResolvedValue({
      id: 1, contractId: 10, amendmentNumber: 1,
      description: 'Long currency', changes: null,
      fileS3Key: null, fileS3Url: null,
      effectiveDate: new Date(), createdBy: 'admin@example.com', createdAt: new Date(),
    });

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Long currency',
        changes: { moneda: { before: 'COP', after: 'TOOLONGCURRENCY' } },
        effectiveDate: '2026-09-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when amendment workplace is too long', async () => {
    const { service, repository, amendmentRepository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));
    amendmentRepository.findNextAmendmentNumber.mockResolvedValue(1);
    amendmentRepository.create.mockResolvedValue({
      id: 1, contractId: 10, amendmentNumber: 1,
      description: 'Long workplace', changes: null,
      fileS3Key: null, fileS3Url: null,
      effectiveDate: new Date(), createdBy: 'admin@example.com', createdAt: new Date(),
    });

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Long workplace',
        changes: { lugar_trabajo: { before: 'Bogota', after: 'A'.repeat(151) } },
        effectiveDate: '2026-09-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when amendment work mode is invalid', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Bad mode',
        changes: { modalidad: { before: 'hibrido', after: 'invalid-mode' } },
        effectiveDate: '2026-06-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when amendment payment method is invalid', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Bad payment',
        changes: { metodo_pago: { before: 'transferencia', after: 'invalid-method' } },
        effectiveDate: '2026-06-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when amendment payment frequency is invalid', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Bad frequency',
        changes: { periodicidad_pago: { before: 'mensual', after: 'invalid-freq' } },
        effectiveDate: '2026-06-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when amendment currency is non-string', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Non-string currency',
        changes: { moneda: { before: 'COP', after: 123 } },
        effectiveDate: '2026-06-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when amendment fecha_fin is invalid date', async () => {
    const { service, repository } = serviceFactory();
    repository.findById.mockResolvedValue(contract({ status: ContractStatus.ACTIVE }));

    await expect(service.createContractAmendment(
      10,
      {
        description: 'Bad date',
        changes: { fecha_fin: { before: '2026-12-31', after: 'not-a-date' } },
        effectiveDate: '2026-06-01',
      },
      { email: 'admin@example.com', role: 'ADMIN' },
    )).rejects.toBeInstanceOf(ValidationError);
  });
});
