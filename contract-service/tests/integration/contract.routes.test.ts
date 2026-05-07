import jwt from 'jsonwebtoken';
import request from 'supertest';

const mockContractService = {
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

jest.mock('../../src/services/contract.service', () => ({
  contractService: mockContractService,
}));

const { app } = require('../../src/app') as typeof import('../../src/app');

function token(role = 'ADMIN'): string {
  return jwt.sign(
    { sub: 'user-1', email: 'admin@example.com', role },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  );
}

const baseContract = {
  id: 7,
  employeeId: 1,
  type: 'fijo',
  salary: '5000000.00',
  currency: 'COP',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  paymentMethod: 'transferencia',
  paymentFrequency: 'mensual',
  workplace: 'Bogota',
  workMode: 'hibrido',
  workSchedule: 'completa',
  fileS3Key: 'contratos/file.pdf',
  fileS3URL: null,
  status: 'activo',
  createdBy: 'admin@example.com',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  paymentDistribution: { baseMonthlySalary: 5000000, amountPerPayment: 5000000, paymentsPerMonth: 1, paymentFrequency: 'mensual' },
};

describe('contract routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Authentication & Authorization ─────────────────────────────────────────

  it('requires authentication for protected contract endpoints', async () => {
    const response = await request(app).get('/api/contratos');
    expect(response.status).toBe(401);
  });

  it('blocks write endpoints for consultation users', async () => {
    const response = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${token('CONSULTATION')}`)
      .send({});
    expect(response.status).toBe(403);
  });

  // ── generateContractUploadUrl ──────────────────────────────────────────────

  it('generates a contract upload URL', async () => {
    mockContractService.generateContractUploadUrl.mockResolvedValue({
      url: 'https://signed-upload.test',
      key: 'contratos/empleados/1/contratos/file.pdf',
      expiresIn: 300,
    });

    const response = await request(app)
      .post('/api/contratos/presigned-url')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empleado_id: 1, contentType: 'application/pdf' });

    expect(response.status).toBe(200);
    expect(response.body.data.expiresIn).toBe(300);
    expect(mockContractService.generateContractUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 1, contentType: 'application/pdf' }),
      expect.stringContaining('Bearer '),
    );
  });

  it('returns 400 when contract upload URL request body is invalid', async () => {
    const response = await request(app)
      .post('/api/contratos/presigned-url')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empleado_id: 1 });
    expect(response.status).toBe(400);
  });

  // ── renewContract ─────────────────────────────────────────────────────────

  it('renews contracts through the Spanish endpoint', async () => {
    mockContractService.renewContract.mockResolvedValue({
      previousContract: { ...baseContract, id: 1, status: 'vencido' },
      contract: { ...baseContract, id: 2, status: 'activo' },
    });

    const response = await request(app)
      .post('/api/contratos/renovaciones')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        empleado_id: 1,
        tipo: 'fijo',
        salario: 5800000,
        fecha_inicio: '2027-01-01',
        fecha_fin: '2027-12-31',
        modalidad: 'hibrido',
        jornada: 'completa',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.contract.id).toBe(2);
    expect(mockContractService.renewContract).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 1, status: 'activo' }),
      expect.stringContaining('Bearer '),
      expect.objectContaining({ email: 'admin@example.com', role: 'ADMIN' }),
      expect.objectContaining({ previousEndDate: null }),
    );
  });

  it('returns 400 when renew request body is invalid', async () => {
    const response = await request(app)
      .post('/api/contratos/renovaciones')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empleado_id: 'invalid', tipo: 'invalid-type' });
    expect(response.status).toBe(400);
  });

  it('returns 400 for renewal with invalid previousStatus', async () => {
    const response = await request(app)
      .post('/api/contratos/renovaciones')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        empleado_id: 1,
        tipo: 'fijo',
        salario: 5000000,
        fecha_inicio: '2027-01-01',
        modalidad: 'hibrido',
        jornada: 'completa',
        estado_anterior: 'activo',
      });
    expect(response.status).toBe(400);
  });

  // ── createContract ────────────────────────────────────────────────────────

  it('creates a contract and returns 201', async () => {
    mockContractService.createContract.mockResolvedValue(baseContract);

    const response = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        empleado_id: 1,
        tipo: 'fijo',
        salario: 5000000,
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-12-31',
        modalidad: 'hibrido',
        jornada: 'completa',
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe(7);
    expect(mockContractService.createContract).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 1 }),
      expect.stringContaining('Bearer '),
      expect.objectContaining({ email: 'admin@example.com' }),
    );
  });

  it('returns 400 when contract creation body is invalid', async () => {
    const response = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empleado_id: -1 });
    expect(response.status).toBe(400);
  });

  // ── findAllContracts ──────────────────────────────────────────────────────

  it('returns all contracts with 200', async () => {
    mockContractService.findAllContracts.mockResolvedValue([baseContract]);

    const response = await request(app)
      .get('/api/contratos')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(mockContractService.findAllContracts).toHaveBeenCalled();
  });

  // ── findContractById ──────────────────────────────────────────────────────

  it('finds a contract by id with 200', async () => {
    mockContractService.findContractById.mockResolvedValue(baseContract);

    const response = await request(app)
      .get('/api/contratos/7')
      .set('Authorization', `Bearer ${token('HR')}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(7);
    expect(mockContractService.findContractById).toHaveBeenCalledWith(7);
  });

  it('returns 400 for non-integer contract id', async () => {
    const response = await request(app)
      .get('/api/contratos/abc')
      .set('Authorization', `Bearer ${token()}`);
    expect(response.status).toBe(400);
  });

  // ── findContractsByEmployeeId ─────────────────────────────────────────────

  it('returns contracts by employee id with 200', async () => {
    mockContractService.findContractsByEmployeeId.mockResolvedValue([baseContract]);

    const response = await request(app)
      .get('/api/contratos/empleado/1')
      .set('Authorization', `Bearer ${token('HR')}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(mockContractService.findContractsByEmployeeId).toHaveBeenCalledWith(1);
  });

  // ── findActiveContractByEmployeeId ────────────────────────────────────────

  it('returns active employee contract with document view', async () => {
    mockContractService.findActiveContractByEmployeeId.mockResolvedValue({
      contract: { ...baseContract, id: 3 },
      document: { key: 'contratos/active.pdf', url: 'https://signed-download.test', expiresIn: 3600 },
    });

    const response = await request(app)
      .get('/api/contratos/empleado/1/activo')
      .set('Authorization', `Bearer ${token('HR')}`);

    expect(response.status).toBe(200);
    expect(response.body.data.document.expiresIn).toBe(3600);
    expect(mockContractService.findActiveContractByEmployeeId).toHaveBeenCalledWith(1);
  });

  // ── updateContractStatus ──────────────────────────────────────────────────

  it('updates contract status and returns 200', async () => {
    mockContractService.updateContractStatus.mockResolvedValue({ ...baseContract, status: 'vencido' });

    const response = await request(app)
      .patch('/api/contratos/7/estado')
      .set('Authorization', `Bearer ${token()}`)
      .send({ estado: 'vencido' });

    expect(response.status).toBe(200);
    expect(mockContractService.updateContractStatus).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ status: 'vencido' }),
      expect.objectContaining({ email: 'admin@example.com' }),
    );
  });

  it('returns 400 when status update body is invalid', async () => {
    const response = await request(app)
      .patch('/api/contratos/7/estado')
      .set('Authorization', `Bearer ${token()}`)
      .send({ estado: 'invalid-status' });
    expect(response.status).toBe(400);
  });

  it('returns 400 for non-integer id in status update', async () => {
    const response = await request(app)
      .patch('/api/contratos/abc/estado')
      .set('Authorization', `Bearer ${token()}`)
      .send({ estado: 'vencido' });
    expect(response.status).toBe(400);
  });

  // ── createContractAmendment ───────────────────────────────────────────────

  it('creates a contract amendment and returns 201', async () => {
    mockContractService.createContractAmendment.mockResolvedValue({
      id: 1, contractId: 7, amendmentNumber: 1,
      description: 'Salary adjustment', effectiveDate: '2026-06-01',
    });

    const response = await request(app)
      .post('/api/contratos/7/adendas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ descripcion: 'Salary adjustment', fecha_vigencia: '2026-06-01' });

    expect(response.status).toBe(201);
    expect(mockContractService.createContractAmendment).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ description: 'Salary adjustment' }),
      expect.objectContaining({ email: 'admin@example.com' }),
    );
  });

  it('returns 400 when amendment body is invalid', async () => {
    const response = await request(app)
      .post('/api/contratos/7/adendas')
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it('returns 400 for non-integer id in amendment creation', async () => {
    const response = await request(app)
      .post('/api/contratos/abc/adendas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ descripcion: 'test', fecha_vigencia: '2026-06-01' });
    expect(response.status).toBe(400);
  });

  // ── findContractAmendments ────────────────────────────────────────────────

  it('returns contract amendments with 200', async () => {
    mockContractService.findContractAmendments.mockResolvedValue([
      { id: 1, contractId: 7, amendmentNumber: 1 },
    ]);

    const response = await request(app)
      .get('/api/contratos/7/adendas')
      .set('Authorization', `Bearer ${token('HR')}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(mockContractService.findContractAmendments).toHaveBeenCalledWith(7);
  });

  // ── generateContractDocumentUrl ───────────────────────────────────────────

  it('generates download URL for a contract', async () => {
    mockContractService.generateContractDocumentUrl.mockResolvedValue({
      key: 'contratos/file.pdf',
      url: 'https://contract-download.test',
      expiresIn: 3600,
    });

    const response = await request(app)
      .get('/api/contratos/7/documento/url')
      .set('Authorization', `Bearer ${token('HR')}`);

    expect(response.status).toBe(200);
    expect(mockContractService.generateContractDocumentUrl).toHaveBeenCalledWith(7);
  });

  // ── generateContractAmendmentUploadUrl ────────────────────────────────────

  it('generates amendment upload URL and returns 200', async () => {
    mockContractService.generateContractAmendmentUploadUrl.mockResolvedValue({
      url: 'https://amendment-upload.test',
      key: 'adendas/test.pdf',
      expiresIn: 300,
    });

    const response = await request(app)
      .post('/api/contratos/7/adendas/presigned-url')
      .set('Authorization', `Bearer ${token()}`)
      .send({ contentType: 'application/pdf' });

    expect(response.status).toBe(200);
    expect(mockContractService.generateContractAmendmentUploadUrl).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ contentType: 'application/pdf' }),
    );
  });

  it('returns 400 when amendment upload URL body is invalid', async () => {
    const response = await request(app)
      .post('/api/contratos/7/adendas/presigned-url')
      .set('Authorization', `Bearer ${token()}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it('returns 400 for non-integer id in amendment upload URL', async () => {
    const response = await request(app)
      .post('/api/contratos/abc/adendas/presigned-url')
      .set('Authorization', `Bearer ${token()}`)
      .send({ contentType: 'application/pdf' });
    expect(response.status).toBe(400);
  });

  // ── generateContractAmendmentDocumentUrl ──────────────────────────────────

  it('generates download URLs for contracts and amendments', async () => {
    mockContractService.generateContractDocumentUrl.mockResolvedValue({
      key: 'contratos/file.pdf',
      url: 'https://contract-download.test',
      expiresIn: 3600,
    });
    mockContractService.generateContractAmendmentDocumentUrl.mockResolvedValue({
      key: 'adendas/file.pdf',
      url: 'https://amendment-download.test',
      expiresIn: 3600,
    });

    const contractResponse = await request(app)
      .get('/api/contratos/7/documento/url')
      .set('Authorization', `Bearer ${token('HR')}`);
    const amendmentResponse = await request(app)
      .get('/api/contratos/7/adendas/2/documento/url')
      .set('Authorization', `Bearer ${token('HR')}`);

    expect(contractResponse.status).toBe(200);
    expect(amendmentResponse.status).toBe(200);
    expect(mockContractService.generateContractDocumentUrl).toHaveBeenCalledWith(7);
    expect(mockContractService.generateContractAmendmentDocumentUrl).toHaveBeenCalledWith(7, 2);
  });

  it('returns 400 for non-integer amendmentId in document URL', async () => {
    const response = await request(app)
      .get('/api/contratos/7/adendas/abc/documento/url')
      .set('Authorization', `Bearer ${token()}`);
    expect(response.status).toBe(400);
  });

  // ── Service error propagation (covers controller catch blocks) ─────────────

  it('propagates service errors through controller catch as 500', async () => {
    mockContractService.findAllContracts.mockRejectedValue(new Error('DB down'));

    const response = await request(app)
      .get('/api/contratos')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(500);
  });

  it('propagates service NotFoundError from findContractById as 404', async () => {
    const { NotFoundError } = require('../../src/shared/errors/not-found.error');
    mockContractService.findContractById.mockRejectedValue(new NotFoundError('Contract not found by Id'));

    const response = await request(app)
      .get('/api/contratos/7')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(404);
  });

  it('propagates service error from findContractsByEmployeeId as 500', async () => {
    mockContractService.findContractsByEmployeeId.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .get('/api/contratos/empleado/1')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(500);
  });

  it('propagates service error from findActiveContractByEmployeeId as 500', async () => {
    mockContractService.findActiveContractByEmployeeId.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .get('/api/contratos/empleado/1/activo')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(500);
  });

  it('propagates service error from updateContractStatus as 500', async () => {
    mockContractService.updateContractStatus.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .patch('/api/contratos/7/estado')
      .set('Authorization', `Bearer ${token()}`)
      .send({ estado: 'vencido' });

    expect(response.status).toBe(500);
  });

  it('propagates service error from createContractAmendment as 500', async () => {
    mockContractService.createContractAmendment.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .post('/api/contratos/7/adendas')
      .set('Authorization', `Bearer ${token()}`)
      .send({ descripcion: 'Test', fecha_vigencia: '2026-06-01' });

    expect(response.status).toBe(500);
  });

  it('propagates service error from findContractAmendments as 500', async () => {
    mockContractService.findContractAmendments.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .get('/api/contratos/7/adendas')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(500);
  });

  it('propagates service error from generateContractDocumentUrl as 500', async () => {
    mockContractService.generateContractDocumentUrl.mockRejectedValue(new Error('S3 error'));

    const response = await request(app)
      .get('/api/contratos/7/documento/url')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(500);
  });

  it('propagates service error from generateContractAmendmentUploadUrl as 500', async () => {
    mockContractService.generateContractAmendmentUploadUrl.mockRejectedValue(new Error('S3 error'));

    const response = await request(app)
      .post('/api/contratos/7/adendas/presigned-url')
      .set('Authorization', `Bearer ${token()}`)
      .send({ contentType: 'application/pdf' });

    expect(response.status).toBe(500);
  });

  it('propagates service error from generateContractAmendmentDocumentUrl as 500', async () => {
    mockContractService.generateContractAmendmentDocumentUrl.mockRejectedValue(new Error('S3 error'));

    const response = await request(app)
      .get('/api/contratos/7/adendas/2/documento/url')
      .set('Authorization', `Bearer ${token()}`);

    expect(response.status).toBe(500);
  });

  it('propagates service error from createContract as 500', async () => {
    mockContractService.createContract.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .post('/api/contratos')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empleado_id: 1, tipo: 'fijo', salario: 5000000, fecha_inicio: '2026-01-01', modalidad: 'hibrido', jornada: 'completa' });

    expect(response.status).toBe(500);
  });

  it('propagates service error from renewContract as 500', async () => {
    mockContractService.renewContract.mockRejectedValue(new Error('DB error'));

    const response = await request(app)
      .post('/api/contratos/renovaciones')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empleado_id: 1, tipo: 'fijo', salario: 5000000, fecha_inicio: '2027-01-01', modalidad: 'hibrido', jornada: 'completa' });

    expect(response.status).toBe(500);
  });

  it('propagates service error from generateContractUploadUrl as 500', async () => {
    mockContractService.generateContractUploadUrl.mockRejectedValue(new Error('S3 error'));

    const response = await request(app)
      .post('/api/contratos/presigned-url')
      .set('Authorization', `Bearer ${token()}`)
      .send({ empleado_id: 1, contentType: 'application/pdf' });

    expect(response.status).toBe(500);
  });
});
