import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';

export interface EmployeeSelfProfile {
  id: number;
  nombre?: string;
  apellido?: string;
  correo_corporativo?: string;
  correo_personal?: string | null;
  fecha_ingreso: string | Date | null;
}

export interface IEmployeeServiceClient {
  getCurrentEmployee(authorizationHeader: string): Promise<EmployeeSelfProfile>;
  getEmployeeById(employeeId: number, authorizationHeader: string): Promise<EmployeeSelfProfile>;
  verifyEmployeeAccess(employeeId: number, authorizationHeader: string): Promise<void>;
  listAccessibleEmployeeIds(authorizationHeader: string): Promise<number[]>;
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

  async getEmployeeById(employeeId: number, authorizationHeader: string): Promise<EmployeeSelfProfile> {
    const response = await fetch(`${env.employeeServiceUrl}/api/empleados/${employeeId}`, {
      headers: { Authorization: authorizationHeader },
    });

    if (!response.ok) {
      throw new UnauthorizedError('No se pudo obtener el empleado asociado a la solicitud');
    }

    const body = await response.json() as { data?: EmployeeSelfProfile };
    if (!body.data?.id) {
      throw new UnauthorizedError('La solicitud no tiene empleado asociado valido');
    }

    return body.data;
  }

  async verifyEmployeeAccess(employeeId: number, authorizationHeader: string): Promise<void> {
    const response = await fetch(`${env.employeeServiceUrl}/api/empleados/${employeeId}`, {
      headers: { Authorization: authorizationHeader },
    });

    if (!response.ok) {
      throw new UnauthorizedError('No se pudo validar acceso al empleado');
    }
  }

  async listAccessibleEmployeeIds(authorizationHeader: string): Promise<number[]> {
    const response = await fetch(`${env.employeeServiceUrl}/api/empleados?limit=10000`, {
      headers: { Authorization: authorizationHeader },
    });

    if (!response.ok) {
      throw new UnauthorizedError('No se pudo validar los empleados accesibles');
    }

    const body = await response.json() as {
      data?: {
        empleados?: Array<{ id?: number | string }>;
      };
    };

    return (body.data?.empleados ?? [])
      .map((employee) => Number(employee.id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }
}

export const employeeServiceClient = new HttpEmployeeServiceClient();
