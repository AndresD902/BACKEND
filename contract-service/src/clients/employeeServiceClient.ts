import { AppError } from "../shared/errors/app-error";
import { env } from "../config/env";
import { NotFoundError } from "../shared/errors/not-found.error";

export interface EmployeeServiceClient{
    verifyEmployeeExists(employeeId: number, authorizationHeader: string): Promise<void>;
}

export class HttpEmployeeServiceClient implements EmployeeServiceClient {
    private readonly timeoutMs = 5000;

    public async verifyEmployeeExists(employeeId: number, authorizationHeader: string): Promise<void> {
        const controller  = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const employeeServiceUrl = env.employeeServiceUrl.replace(/\/$/, '');
            const response = await fetch(`${employeeServiceUrl}/api/empleados/${employeeId}`, {
                method: 'GET',
                headers: {
                    authorization: authorizationHeader,
                    Accept: 'application/json',
                },
                signal: controller.signal,
            });

            if (response.ok){
                return;
            }

            if (response.status === 404) {
                throw new NotFoundError(`Employee with id ${employeeId} not found`);
            }

            if (response.status === 401 || response.status === 403  ) {
                throw new AppError('Employee Service rejected the authentication token', response.status);
            }
            
            throw new AppError('Employee Service returned an unexpected response', 502,{
                status: response.status,
            });
        } catch (error) {
            if (error instanceof AppError){
                throw error;
            }

            throw new AppError('Employee Service is not available', 503);
        } finally {
            clearTimeout(timeout);
        }
    }
}

export const employeeServiceClient = new HttpEmployeeServiceClient();