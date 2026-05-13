import type { Request, Response, NextFunction } from 'express';
import { ContractController } from '../../src/controller/contract.controller';
import { AppError } from '../../src/shared/errors/app-error';
import { ValidationError } from '../../src/shared/errors/validation.error';
import { ContractStatus } from '../../src/shared/enums/contract-status.enum';

jest.mock('../../src/services/contract.service', () => ({
  contractService: {},
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BEARER_TOKEN = 'Bearer valid-test-token';
const ACTOR = { email: 'admin@test.com', role: 'ADMIN' };

const VALID_CONTRACT_BODY = {
  empleado_id: 1,
  tipo: 'fijo',
  salario: 5_000_000,
  fecha_inicio: '2026-01-01',
  fecha_fin: '2026-12-31',
  modalidad: 'hibrido',
  jornada: 'completa',
};

const VALID_AMENDMENT_BODY = {
  descripcion: 'Salary adjustment',
  fecha_vigencia: '2026-06-01',
};

const VALID_STATUS_BODY = { estado: 'vencido' };

const VALID_UPLOAD_BODY = { empleado_id: 1, contentType: 'application/pdf' };

const VALID_AMENDMENT_UPLOAD_BODY = { contentType: 'application/pdf' };

const BASE_CONTRACT = {
  id: 7,
  employeeId: 1,
  status: 'activo',
  salary: '5000000.00',
  createdBy: ACTOR.email,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockRes(): jest.Mocked<Response> {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as jest.Mocked<Response>;
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function makeAuthReq(overrides: Partial<Request> = {}): Request {
  return makeReq({
    headers: { authorization: BEARER_TOKEN },
    user: ACTOR,
    ...overrides,
  });
}

type MockService = {
  [K in keyof InstanceType<typeof ContractController> extends string ? never : string]: jest.Mock;
} & Record<string, jest.Mock>;

function buildMockService(): MockService {
  return {
    createContract: jest.fn(),
    renewContract: jest.fn(),
    findAllContracts: jest.fn(),
    findContractById: jest.fn(),
    findContractsByEmployeeId: jest.fn(),
    findActiveContractByEmployeeId: jest.fn(),
    updateContractStatus: jest.fn(),
    createContractAmendment: jest.fn(),
    findContractAmendments: jest.fn(),
    generateContractUploadUrl: jest.fn(),
    generateContractDocumentUrl: jest.fn(),
    generateContractAmendmentUploadUrl: jest.fn(),
    generateContractAmendmentDocumentUrl: jest.fn(),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('ContractController', () => {
  let service: MockService;
  let controller: ContractController;
  let res: jest.Mocked<Response>;
  let next: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = buildMockService();
    controller = new ContractController(service as never);
    res = mockRes();
    next = jest.fn();
  });

  // ── createContract ──────────────────────────────────────────────────────────

  describe('createContract', () => {
    it('responds 201 with the created contract on success', async () => {
      service.createContract.mockResolvedValue(BASE_CONTRACT);
      const req = makeAuthReq({ body: VALID_CONTRACT_BODY });

      await controller.createContract(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: BASE_CONTRACT }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('passes ValidationError to next when request body is invalid', async () => {
      const req = makeAuthReq({ body: { empleado_id: -1 } });

      await controller.createContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(service.createContract).not.toHaveBeenCalled();
    });

    it('passes error to next when the service throws', async () => {
      service.createContract.mockRejectedValue(new Error('DB error'));
      const req = makeAuthReq({ body: VALID_CONTRACT_BODY });

      await controller.createContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('passes AppError 401 to next when authorization header is missing', async () => {
      const req = makeReq({ body: VALID_CONTRACT_BODY, user: ACTOR });

      await controller.createContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('passes AppError 401 to next when authorization header has wrong format', async () => {
      const req = makeReq({
        body: VALID_CONTRACT_BODY,
        headers: { authorization: 'Basic abc123' },
        user: ACTOR,
      });

      await controller.createContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('passes AppError 401 to next when authenticated user is missing from request', async () => {
      const req = makeReq({
        body: VALID_CONTRACT_BODY,
        headers: { authorization: BEARER_TOKEN },
      });

      await controller.createContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('forwards the authorization header to the service', async () => {
      service.createContract.mockResolvedValue(BASE_CONTRACT);
      const req = makeAuthReq({ body: VALID_CONTRACT_BODY });

      await controller.createContract(req, res, next);

      expect(service.createContract).toHaveBeenCalledWith(
        expect.anything(),
        BEARER_TOKEN,
        expect.anything(),
      );
    });
  });

  // ── renewContract ───────────────────────────────────────────────────────────

  describe('renewContract', () => {
    const RENEWAL_RESULT = {
      previousContract: { ...BASE_CONTRACT, id: 1, status: 'vencido' },
      contract: { ...BASE_CONTRACT, id: 2 },
    };

    it('responds 201 with the renewal result on success', async () => {
      service.renewContract.mockResolvedValue(RENEWAL_RESULT);
      const req = makeAuthReq({ body: VALID_CONTRACT_BODY });

      await controller.renewContract(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: RENEWAL_RESULT }),
      );
    });

    it('passes ValidationError to next when request body is invalid', async () => {
      const req = makeAuthReq({ body: { tipo: 'invalid-type' } });

      await controller.renewContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes error to next when the service throws', async () => {
      service.renewContract.mockRejectedValue(new Error('DB error'));
      const req = makeAuthReq({ body: VALID_CONTRACT_BODY });

      await controller.renewContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('passes EXPIRED previousStatus to the service', async () => {
      service.renewContract.mockResolvedValue(RENEWAL_RESULT);
      const req = makeAuthReq({
        body: { ...VALID_CONTRACT_BODY, previousStatus: ContractStatus.EXPIRED },
      });

      await controller.renewContract(req, res, next);

      expect(service.renewContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ previousStatus: ContractStatus.EXPIRED }),
      );
    });

    it('passes TERMINATED previousStatus to the service', async () => {
      service.renewContract.mockResolvedValue(RENEWAL_RESULT);
      const req = makeAuthReq({
        body: { ...VALID_CONTRACT_BODY, previousStatus: ContractStatus.TERMINATED },
      });

      await controller.renewContract(req, res, next);

      expect(service.renewContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ previousStatus: ContractStatus.TERMINATED }),
      );
    });

    it('passes ValidationError to next when previousStatus is not EXPIRED or TERMINATED', async () => {
      const req = makeAuthReq({
        body: { ...VALID_CONTRACT_BODY, previousStatus: ContractStatus.ACTIVE },
      });

      await controller.renewContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('uses Spanish field name estado_anterior for previousStatus', async () => {
      service.renewContract.mockResolvedValue(RENEWAL_RESULT);
      const req = makeAuthReq({
        body: { ...VALID_CONTRACT_BODY, estado_anterior: ContractStatus.EXPIRED },
      });

      await controller.renewContract(req, res, next);

      expect(service.renewContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ previousStatus: ContractStatus.EXPIRED }),
      );
    });

    it('includes previousEndDate as a string when provided', async () => {
      service.renewContract.mockResolvedValue(RENEWAL_RESULT);
      const req = makeAuthReq({
        body: { ...VALID_CONTRACT_BODY, previousEndDate: '2025-12-31' },
      });

      await controller.renewContract(req, res, next);

      expect(service.renewContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ previousEndDate: '2025-12-31' }),
      );
    });

    it('sets previousEndDate to null when not provided', async () => {
      service.renewContract.mockResolvedValue(RENEWAL_RESULT);
      const req = makeAuthReq({ body: VALID_CONTRACT_BODY });

      await controller.renewContract(req, res, next);

      expect(service.renewContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ previousEndDate: null }),
      );
    });
  });

  // ── findAllContracts ────────────────────────────────────────────────────────

  describe('findAllContracts', () => {
    it('responds 200 with all contracts on success', async () => {
      service.findAllContracts.mockResolvedValue([BASE_CONTRACT]);
      const req = makeReq();

      await controller.findAllContracts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [BASE_CONTRACT] }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('passes error to next when the service throws', async () => {
      service.findAllContracts.mockRejectedValue(new Error('DB error'));

      await controller.findAllContracts(makeReq(), res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── findContractById ────────────────────────────────────────────────────────

  describe('findContractById', () => {
    it('responds 200 with the contract when found', async () => {
      service.findContractById.mockResolvedValue(BASE_CONTRACT);
      const req = makeReq({ params: { id: '7' } });

      await controller.findContractById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.findContractById).toHaveBeenCalledWith(7);
    });

    it('passes error to next when the service throws', async () => {
      service.findContractById.mockRejectedValue(new Error('not found'));
      const req = makeReq({ params: { id: '7' } });

      await controller.findContractById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('passes ValidationError to next when id is not a number', async () => {
      const req = makeReq({ params: { id: 'abc' } });

      await controller.findContractById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when id is zero', async () => {
      const req = makeReq({ params: { id: '0' } });

      await controller.findContractById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when id is negative', async () => {
      const req = makeReq({ params: { id: '-1' } });

      await controller.findContractById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when id is a decimal', async () => {
      const req = makeReq({ params: { id: '3.5' } });

      await controller.findContractById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when id is an array', async () => {
      const req = makeReq({ params: { id: ['1', '2'] as unknown as string } });

      await controller.findContractById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when id is undefined', async () => {
      const req = makeReq({ params: {} });

      await controller.findContractById(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  // ── findContractsByEmployeeId ────────────────────────────────────────────────

  describe('findContractsByEmployeeId', () => {
    it('responds 200 with employee contracts on success', async () => {
      service.findContractsByEmployeeId.mockResolvedValue([BASE_CONTRACT]);
      const req = makeReq({ params: { employeeId: '1' } });

      await controller.findContractsByEmployeeId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.findContractsByEmployeeId).toHaveBeenCalledWith(1);
    });

    it('passes ValidationError to next when employeeId is invalid', async () => {
      const req = makeReq({ params: { employeeId: 'abc' } });

      await controller.findContractsByEmployeeId(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes error to next when the service throws', async () => {
      service.findContractsByEmployeeId.mockRejectedValue(new Error('DB error'));
      const req = makeReq({ params: { employeeId: '1' } });

      await controller.findContractsByEmployeeId(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── findActiveContractByEmployeeId ──────────────────────────────────────────

  describe('findActiveContractByEmployeeId', () => {
    it('responds 200 with the active contract on success', async () => {
      const result = { contract: BASE_CONTRACT, document: null };
      service.findActiveContractByEmployeeId.mockResolvedValue(result);
      const req = makeReq({ params: { employeeId: '1' } });

      await controller.findActiveContractByEmployeeId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.findActiveContractByEmployeeId).toHaveBeenCalledWith(1);
    });

    it('passes ValidationError to next when employeeId is invalid', async () => {
      const req = makeReq({ params: { employeeId: '0' } });

      await controller.findActiveContractByEmployeeId(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes error to next when the service throws', async () => {
      service.findActiveContractByEmployeeId.mockRejectedValue(new Error('Not found'));
      const req = makeReq({ params: { employeeId: '1' } });

      await controller.findActiveContractByEmployeeId(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── updateContractStatus ────────────────────────────────────────────────────

  describe('updateContractStatus', () => {
    it('responds 200 with the updated contract on success', async () => {
      const updated = { ...BASE_CONTRACT, status: 'vencido' };
      service.updateContractStatus.mockResolvedValue(updated);
      const req = makeAuthReq({ params: { id: '7' }, body: VALID_STATUS_BODY });

      await controller.updateContractStatus(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.updateContractStatus).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: 'vencido' }),
        ACTOR,
      );
    });

    it('passes ValidationError to next when status body is invalid', async () => {
      const req = makeAuthReq({ params: { id: '7' }, body: { estado: 'invalid' } });

      await controller.updateContractStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when id is invalid', async () => {
      const req = makeAuthReq({ params: { id: 'abc' }, body: VALID_STATUS_BODY });

      await controller.updateContractStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes AppError 401 to next when user is missing', async () => {
      const req = makeReq({
        params: { id: '7' },
        body: VALID_STATUS_BODY,
        headers: { authorization: BEARER_TOKEN },
      });

      await controller.updateContractStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('passes error to next when the service throws', async () => {
      service.updateContractStatus.mockRejectedValue(new Error('DB error'));
      const req = makeAuthReq({ params: { id: '7' }, body: VALID_STATUS_BODY });

      await controller.updateContractStatus(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── createContractAmendment ─────────────────────────────────────────────────

  describe('createContractAmendment', () => {
    const AMENDMENT_RESULT = {
      id: 1,
      contractId: 7,
      amendmentNumber: 1,
      description: 'Salary adjustment',
    };

    it('responds 201 with the created amendment on success', async () => {
      service.createContractAmendment.mockResolvedValue(AMENDMENT_RESULT);
      const req = makeAuthReq({ params: { id: '7' }, body: VALID_AMENDMENT_BODY });

      await controller.createContractAmendment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(service.createContractAmendment).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ description: 'Salary adjustment' }),
        ACTOR,
      );
    });

    it('passes ValidationError to next when amendment body is invalid', async () => {
      const req = makeAuthReq({ params: { id: '7' }, body: {} });

      await controller.createContractAmendment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when contract id is invalid', async () => {
      const req = makeAuthReq({ params: { id: 'abc' }, body: VALID_AMENDMENT_BODY });

      await controller.createContractAmendment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes AppError 401 to next when user is missing', async () => {
      const req = makeReq({
        params: { id: '7' },
        body: VALID_AMENDMENT_BODY,
        headers: { authorization: BEARER_TOKEN },
      });

      await controller.createContractAmendment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('passes error to next when the service throws', async () => {
      service.createContractAmendment.mockRejectedValue(new Error('DB error'));
      const req = makeAuthReq({ params: { id: '7' }, body: VALID_AMENDMENT_BODY });

      await controller.createContractAmendment(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── findContractAmendments ──────────────────────────────────────────────────

  describe('findContractAmendments', () => {
    it('responds 200 with amendments on success', async () => {
      service.findContractAmendments.mockResolvedValue([{ id: 1, contractId: 7 }]);
      const req = makeReq({ params: { id: '7' } });

      await controller.findContractAmendments(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.findContractAmendments).toHaveBeenCalledWith(7);
    });

    it('passes ValidationError to next when contract id is invalid', async () => {
      const req = makeReq({ params: { id: '-3' } });

      await controller.findContractAmendments(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes error to next when the service throws', async () => {
      service.findContractAmendments.mockRejectedValue(new Error('DB error'));
      const req = makeReq({ params: { id: '7' } });

      await controller.findContractAmendments(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── generateContractUploadUrl ───────────────────────────────────────────────

  describe('generateContractUploadUrl', () => {
    const UPLOAD_RESULT = { url: 'https://signed-upload.test', key: 'contratos/file.pdf', expiresIn: 300 };

    it('responds 200 with the upload URL on success', async () => {
      service.generateContractUploadUrl.mockResolvedValue(UPLOAD_RESULT);
      const req = makeAuthReq({ body: VALID_UPLOAD_BODY });

      await controller.generateContractUploadUrl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.generateContractUploadUrl).toHaveBeenCalledWith(
        expect.objectContaining({ employeeId: 1, contentType: 'application/pdf' }),
        BEARER_TOKEN,
      );
    });

    it('passes ValidationError to next when upload body is invalid', async () => {
      const req = makeAuthReq({ body: { empleado_id: 1 } });

      await controller.generateContractUploadUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes AppError 401 to next when authorization header is missing', async () => {
      const req = makeReq({ body: VALID_UPLOAD_BODY, user: ACTOR });

      await controller.generateContractUploadUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    });

    it('passes error to next when the service throws', async () => {
      service.generateContractUploadUrl.mockRejectedValue(new Error('S3 error'));
      const req = makeAuthReq({ body: VALID_UPLOAD_BODY });

      await controller.generateContractUploadUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── generateContractDocumentUrl ─────────────────────────────────────────────

  describe('generateContractDocumentUrl', () => {
    const DOCUMENT_RESULT = { url: 'https://signed-download.test', key: 'contratos/file.pdf', expiresIn: 3600 };

    it('responds 200 with the download URL on success', async () => {
      service.generateContractDocumentUrl.mockResolvedValue(DOCUMENT_RESULT);
      const req = makeReq({ params: { id: '7' } });

      await controller.generateContractDocumentUrl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.generateContractDocumentUrl).toHaveBeenCalledWith(7);
    });

    it('passes ValidationError to next when contract id is invalid', async () => {
      const req = makeReq({ params: { id: 'abc' } });

      await controller.generateContractDocumentUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes error to next when the service throws', async () => {
      service.generateContractDocumentUrl.mockRejectedValue(new Error('S3 error'));
      const req = makeReq({ params: { id: '7' } });

      await controller.generateContractDocumentUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── generateContractAmendmentUploadUrl ──────────────────────────────────────

  describe('generateContractAmendmentUploadUrl', () => {
    const AMENDMENT_UPLOAD_RESULT = { url: 'https://amendment-upload.test', key: 'adendas/test.pdf', expiresIn: 300 };

    it('responds 200 with the upload URL on success', async () => {
      service.generateContractAmendmentUploadUrl.mockResolvedValue(AMENDMENT_UPLOAD_RESULT);
      const req = makeReq({ params: { id: '7' }, body: VALID_AMENDMENT_UPLOAD_BODY });

      await controller.generateContractAmendmentUploadUrl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.generateContractAmendmentUploadUrl).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ contentType: 'application/pdf' }),
      );
    });

    it('passes ValidationError to next when upload body is invalid', async () => {
      const req = makeReq({ params: { id: '7' }, body: {} });

      await controller.generateContractAmendmentUploadUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when contract id is invalid', async () => {
      const req = makeReq({ params: { id: 'abc' }, body: VALID_AMENDMENT_UPLOAD_BODY });

      await controller.generateContractAmendmentUploadUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes error to next when the service throws', async () => {
      service.generateContractAmendmentUploadUrl.mockRejectedValue(new Error('S3 error'));
      const req = makeReq({ params: { id: '7' }, body: VALID_AMENDMENT_UPLOAD_BODY });

      await controller.generateContractAmendmentUploadUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── generateContractAmendmentDocumentUrl ────────────────────────────────────

  describe('generateContractAmendmentDocumentUrl', () => {
    const AMENDMENT_DOCUMENT_RESULT = { url: 'https://amendment-download.test', key: 'adendas/file.pdf', expiresIn: 3600 };

    it('responds 200 with the download URL on success', async () => {
      service.generateContractAmendmentDocumentUrl.mockResolvedValue(AMENDMENT_DOCUMENT_RESULT);
      const req = makeReq({ params: { id: '7', amendmentId: '2' } });

      await controller.generateContractAmendmentDocumentUrl(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.generateContractAmendmentDocumentUrl).toHaveBeenCalledWith(7, 2);
    });

    it('passes ValidationError to next when contract id is invalid', async () => {
      const req = makeReq({ params: { id: 'abc', amendmentId: '2' } });

      await controller.generateContractAmendmentDocumentUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when amendment id is invalid', async () => {
      const req = makeReq({ params: { id: '7', amendmentId: 'abc' } });

      await controller.generateContractAmendmentDocumentUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes ValidationError to next when amendment id is zero', async () => {
      const req = makeReq({ params: { id: '7', amendmentId: '0' } });

      await controller.generateContractAmendmentDocumentUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('passes error to next when the service throws', async () => {
      service.generateContractAmendmentDocumentUrl.mockRejectedValue(new Error('S3 error'));
      const req = makeReq({ params: { id: '7', amendmentId: '2' } });

      await controller.generateContractAmendmentDocumentUrl(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ── getRenewalOptions — additional branches not reachable via HTTP ───────────

  describe('getRenewalOptions — body edge cases', () => {
    it('passes ValidationError to next when body is an array (fails Zod validation)', async () => {
      const req = makeAuthReq({ body: [] });

      await controller.renewContract(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      expect(service.renewContract).not.toHaveBeenCalled();
    });

    it('uses Spanish alias fecha_fin_anterior for previousEndDate', async () => {
      service.renewContract.mockResolvedValue({});
      const req = makeAuthReq({
        body: { ...VALID_CONTRACT_BODY, fecha_fin_anterior: '2025-06-30' },
      });

      await controller.renewContract(req, res, next);

      expect(service.renewContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ previousEndDate: '2025-06-30' }),
      );
    });

    it('uses English alias previous_end_date for previousEndDate', async () => {
      service.renewContract.mockResolvedValue({});
      const req = makeAuthReq({
        body: { ...VALID_CONTRACT_BODY, previous_end_date: '2025-06-30' },
      });

      await controller.renewContract(req, res, next);

      expect(service.renewContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ previousEndDate: '2025-06-30' }),
      );
    });

    it('uses English alias previous_status for previousStatus', async () => {
      service.renewContract.mockResolvedValue({});
      const req = makeAuthReq({
        body: { ...VALID_CONTRACT_BODY, previous_status: ContractStatus.EXPIRED },
      });

      await controller.renewContract(req, res, next);

      expect(service.renewContract).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ previousStatus: ContractStatus.EXPIRED }),
      );
    });
  });

  // ── AppError class ──────────────────────────────────────────────────────────

  describe('AppError', () => {
    it('stores message, statusCode and sets name to class name', () => {
      const error = new AppError('Something failed', 422);

      expect(error.message).toBe('Something failed');
      expect(error.statusCode).toBe(422);
      expect(error.name).toBe('AppError');
    });

    it('stores optional details when provided', () => {
      const details = { field: 'salary', issue: 'negative value' };
      const error = new AppError('Validation failed', 400, details);

      expect(error.details).toEqual(details);
    });

    it('details is undefined when not provided', () => {
      const error = new AppError('Not found', 404);

      expect(error.details).toBeUndefined();
    });

    it('is an instance of Error', () => {
      expect(new AppError('msg', 500)).toBeInstanceOf(Error);
    });
  });
});
