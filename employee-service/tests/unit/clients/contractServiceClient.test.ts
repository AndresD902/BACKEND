import { ContractServiceClient } from '../../../src/clients/contractServiceClient';
import { AppError } from '../../../src/shared/errors/app-error';

describe('ContractServiceClient', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns the active contract payload from contract-service', async () => {
    const activeContract = {
      contract: { id: 10, status: 'activo' },
      document: {
        key: 'contratos/empleados/1/contratos/file.pdf',
        url: 'https://signed-download.test',
        expiresIn: 3600,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: activeContract }),
    });

    const client = new ContractServiceClient();
    const result = await client.getActiveContractForEmployee(1, 'Bearer token');

    expect(result).toEqual(activeContract);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3003/api/contratos/empleado/1/activo',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: 'Bearer token',
          Accept: 'application/json',
        }),
      }),
    );
  });

  it('returns null when contract-service has no active contract for the employee', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn(),
    });

    const client = new ContractServiceClient();
    const result = await client.getActiveContractForEmployee(1, 'Bearer token');

    expect(result).toBeNull();
  });

  it('preserves authentication errors from contract-service', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      json: jest.fn(),
    });

    const client = new ContractServiceClient();

    await expect(client.getActiveContractForEmployee(1, 'Bearer token'))
      .rejects.toMatchObject({
        statusCode: 403,
        code: 'CONTRACT_SERVICE_AUTH_ERROR',
      });
  });

  it('wraps network failures as service unavailable errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    const client = new ContractServiceClient();

    await expect(client.getActiveContractForEmployee(1, 'Bearer token'))
      .rejects.toBeInstanceOf(AppError);
    await expect(client.getActiveContractForEmployee(1, 'Bearer token'))
      .rejects.toMatchObject({
        statusCode: 503,
        code: 'CONTRACT_SERVICE_UNAVAILABLE',
      });
  });
});
