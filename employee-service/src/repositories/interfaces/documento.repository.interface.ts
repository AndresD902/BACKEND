import { DocumentoEmpleado } from '../../entities/employee.entity';

export interface IDocumentoRepository {
  findAll(empleadoId: number): Promise<DocumentoEmpleado[]>;
  findById(id: number): Promise<DocumentoEmpleado | null>;
  desactivarPorTipo(empleadoId: number, tipo: string): Promise<void>;
  create(data: Record<string, unknown>): Promise<DocumentoEmpleado>;
  approve(documentoId: number, aprobadoPor: string): Promise<DocumentoEmpleado | null>;
  update(documentoId: number, data: Record<string, unknown>): Promise<DocumentoEmpleado | null>;
}
