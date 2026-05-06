import { Departamento } from '../../entities/department.entity';

export interface IDepartamentoRepository {
  findAll(): Promise<Departamento[]>;
  findById(id: number): Promise<Departamento | null>;
  findByNombre(nombre: string): Promise<Departamento | null>;
  create(data: { nombre: string; descripcion?: string }): Promise<Departamento>;
  update(id: number, data: { nombre?: string; descripcion?: string }): Promise<Departamento | null>;
  delete(id: number): Promise<boolean>;
}
