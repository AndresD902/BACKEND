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
    {
      sub: 'user-1',
      email: 'admin@example.com',
      role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' },
  );
}

describe('contract routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('generates a contract upload URL', async () => {
    mockContractService.generateContractUploadUrl.mockResolvedValue({
      url: 'https://signed-upload.test',
      key: 'contratos/empleados/1/contratos/file.pdf',
      expiresIn: 300,
    });

    const response = await request(app)
      .post('/api/contratos/presigned-url')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        empleado_id: 1,
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body.data.expiresIn).toBe(300);
    expect(mockContractService.generateContractUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 1, contentType: 'application/pdf' }),
      expect.stringContaining('Bearer '),
    );
  });

  it('renews contracts through the Spanish endpoint', async () => {
    mockContractService.renewContract.mockResolvedValue({
      previousContract: { id: 1, status: 'vencido' },
      contract: { id: 2, status: 'activo' },
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

  it('returns active employee contract with document view', async () => {
    mockContractService.findActiveContractByEmployeeId.mockResolvedValue({
      contract: { id: 3, employeeId: 1, status: 'activo' },
      document: { key: 'contratos/active.pdf', url: 'https://signed-download.test', expiresIn: 3600 },
    });

    const response = await request(app)
      .get('/api/contratos/empleado/1/activo')
      .set('Authorization', `Bearer ${token('HR')}`);

    expect(response.status).toBe(200);
    expect(response.body.data.document.expiresIn).toBe(3600);
    expect(mockContractService.findActiveContractByEmployeeId).toHaveBeenCalledWith(1);
  });

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
});
