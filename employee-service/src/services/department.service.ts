import { IDepartamentoRepository } from '../repositories/interfaces/department.repository.interface';
import { departamentoRepository } from '../repositories/department.repository';
import { Departamento } from '../entities/department.entity';
import { ConflictError } from '../shared/errors/conflict.error';
import { NotFoundError } from '../shared/errors/not-found.error';

export const COLOMBIA_DEPARTMENTS: readonly string[] = [
  'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
  'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
  'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
  'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
  'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima',
  'Valle del Cauca', 'Vaupés', 'Vichada', 'Bogotá D.C.',
];

export class DepartamentoService {
  constructor(private readonly repo: IDepartamentoRepository = departamentoRepository) {}

  getColombiaList(): string[] {
    return [...COLOMBIA_DEPARTMENTS];
  }

  async getAll(): Promise<Departamento[]> {
    return this.repo.findAll();
  }

  async getById(id: number): Promise<Departamento> {
    const dep = await this.repo.findById(id);
    if (!dep) throw new NotFoundError(`Departamento con id ${id} no encontrado`);
    return dep;
  }

  async create(nombre: string, descripcion?: string): Promise<Departamento> {
    const existe = await this.repo.findByNombre(nombre);
    if (existe) throw new ConflictError(`Ya existe un departamento con el nombre "${nombre}"`);
    return this.repo.create({ nombre, descripcion });
  }

  async update(id: number, data: { nombre?: string; descripcion?: string }): Promise<Departamento> {
    await this.getById(id);
    if (data.nombre) {
      const existe = await this.repo.findByNombre(data.nombre);
      if (existe && existe.id !== id) {
        throw new ConflictError(`Ya existe un departamento con el nombre "${data.nombre}"`);
      }
    }
    const dep = await this.repo.update(id, data);
    if (!dep) throw new NotFoundError(`Departamento con id ${id} no encontrado`);
    return dep;
  }

  async delete(id: number): Promise<void> {
    await this.getById(id);
    await this.repo.delete(id);
  }
}

export const departamentoService = new DepartamentoService();
