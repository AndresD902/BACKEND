import { Empleado, CargoSalario, DocumentoEmpleado } from '../../entities/employee.entity';
import { CreateEmpleadoDto } from '../../dtos/create-employee.dto';
import { UpdateEmpleadoDto, CreateCargoDto, ConfirmarDocumentoDto, PresignedUrlDto } from '../../dtos/update-employee.dto';
import { AuthenticatedUser } from '../../types/authenticated-user.type';

export interface IEmployeeService {
  getAll(page: number, limit: number): Promise<{ empleados: Empleado[]; total: number; page: number; limit: number }>;
  getById(id: number): Promise<Empleado>;
  create(dto: CreateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado>;
  update(id: number, dto: UpdateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado>;
  softDelete(id: number, actor: AuthenticatedUser): Promise<Empleado>;
  getCargoActual(empleadoId: number): Promise<CargoSalario | null>;
  getHistorialCargos(empleadoId: number): Promise<CargoSalario[]>;
  crearCargo(empleadoId: number, dto: CreateCargoDto, actor: AuthenticatedUser): Promise<CargoSalario>;
  getDocumentos(empleadoId: number): Promise<DocumentoEmpleado[]>;
  generarPresignedUrl(dto: PresignedUrlDto): Promise<{ url: string; key: string }>;
  confirmarDocumento(empleadoId: number, dto: ConfirmarDocumentoDto, actor: AuthenticatedUser): Promise<DocumentoEmpleado>;
  generarUrlDescargaDocumento(docId: number): Promise<{ url: string; expires_in: number }>;
}
