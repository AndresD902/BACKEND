import { env } from '../config/env';
import { AppError } from '../shared/errors/app-error';

export interface ActiveContractDocument {
  contract: unknown;
  document: {
    key: string;
    url: string;
    expiresIn: number;
  } | null;
}

export interface IContractServiceClient {
  getActiveContractForEmployee(employeeId: number, authorizationHeader: string): Promise<ActiveContractDocument | null>;
  getLatestContractForCurrentUser(authorizationHeader: string): Promise<ActiveContractDocument | null>;
}

export class ContractServiceClient implements IContractServiceClient {
  private readonly timeoutMs = 5000;

  async getLatestContractForCurrentUser(authorizationHeader: string): Promise<ActiveContractDocument | null> {
    return this.requestContract('/api/contratos/me/latest', authorizationHeader);
  }

  async getActiveContractForEmployee(employeeId: number, authorizationHeader: string): Promise<ActiveContractDocument | null> {
    return this.requestContract(`/api/contratos/empleado/${employeeId}/activo`, authorizationHeader);
  }

  private async requestContract(path: string, authorizationHeader: string): Promise<ActiveContractDocument | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const contractServiceUrl = env.contractServiceUrl
        .replace(/\/+$/, '')
        .replace(/\/api$/i, '');
      const response = await fetch(`${contractServiceUrl}${path}`, {
        method: 'GET',
        headers: {
          authorization: authorizationHeader,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (response.status === 404) {
        return null;
      }

      if (response.status === 401 || response.status === 403) {
        throw new AppError('Contract Service rejected the authentication token', response.status, 'CONTRACT_SERVICE_AUTH_ERROR');
      }

      if (!response.ok) {
        throw new AppError('Contract Service returned an unexpected response', 502, 'CONTRACT_SERVICE_BAD_RESPONSE', {
          status: response.status,
        });
      }

      const payload = await response.json() as { data?: ActiveContractDocument };

      return payload.data ?? null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError('Contract Service is not available', 503, 'CONTRACT_SERVICE_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const contractServiceClient = new ContractServiceClient();
