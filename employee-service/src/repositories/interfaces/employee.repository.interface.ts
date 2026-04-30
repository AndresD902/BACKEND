import { Empleado } from '../../entities/employee.entity';

export interface IEmployeeRepository {
  findAll(limit: number, offset: number): Promise<Empleado[]>;
  count(): Promise<number>;
  findById(id: number): Promise<Empleado | null>;
  findByCedula(cedula: string): Promise<Empleado | null>;
  findByCorreoCorporativo(correo: string): Promise<Empleado | null>;
  create(data: Record<string, unknown>): Promise<Empleado>;
  update(id: number, data: Record<string, unknown>): Promise<Empleado | null>;
  updateEstadoByCorreo(correo: string, estado: string): Promise<void>;
  softDelete(id: number): Promise<Empleado | null>;
}
