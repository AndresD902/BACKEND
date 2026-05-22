import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';

export interface EmployeeSelfProfile {
  id: number;
  fecha_ingreso: string | Date | null;
}

export interface IEmployeeServiceClient {
  getCurrentEmployee(authorizationHeader: string): Promise<EmployeeSelfProfile>;
}

export class HttpEmployeeServiceClient implements IEmployeeServiceClient {
  async getCurrentEmployee(authorizationHeader: string): Promise<EmployeeSelfProfile> {
    const response = await fetch(`${env.employeeServiceUrl}/api/empleados/me`, {
      headers: { Authorization: authorizationHeader },
    });

    if (!response.ok) {
      throw new UnauthorizedError('No se pudo validar el empleado asociado al usuario');
    }

    const body = await response.json() as { data?: EmployeeSelfProfile };
    if (!body.data?.id) {
      throw new UnauthorizedError('El usuario consultante no tiene empleado asociado');
    }

    return body.data;
  }
}

export const employeeServiceClient = new HttpEmployeeServiceClient();
