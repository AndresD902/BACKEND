import { CargoSalario } from '../../entities/employee.entity';

export interface ICargoSalarioRepository {
  findActivo(empleadoId: number): Promise<CargoSalario | null>;
  findAll(empleadoId: number): Promise<CargoSalario[]>;
  cerrarActivo(empleadoId: number): Promise<void>;
  create(data: Record<string, unknown>): Promise<CargoSalario>;
}
