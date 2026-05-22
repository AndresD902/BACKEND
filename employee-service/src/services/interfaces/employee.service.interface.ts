import { Empleado, CargoSalario, DocumentoEmpleado } from '../../entities/employee.entity';
import { CreateEmpleadoDto } from '../../dtos/create-employee.dto';
import { UpdateEmpleadoDto, CreateCargoDto, ConfirmarDocumentoDto, PresignedUrlDto } from '../../dtos/update-employee.dto';
import { AuthenticatedUser } from '../../types/authenticated-user.type';
import { EmployeeFilters } from '../../repositories/interfaces/employee.repository.interface';
import { ActiveContractDocument } from '../../clients/contractServiceClient';

export interface IEmployeeService {
  getAll(page: number, limit: number, filters?: EmployeeFilters): Promise<{ empleados: Empleado[]; total: number; page: number; limit: number }>;
  getById(id: number): Promise<Empleado>;
  getMe(userEmail: string): Promise<Empleado>;
  getCargoActualMe(userEmail: string): Promise<CargoSalario | null>;
  getContratoLaboralActivoMe(userEmail: string, authorizationHeader: string): Promise<ActiveContractDocument | null>;
  getDocumentosMe(userEmail: string): Promise<DocumentoEmpleado[]>;
  generarUrlDescargaDocumentoPropio(userEmail: string, docId: number): Promise<{ url: string; expires_in: number }>;
  solicitarCorreccionMe(userEmail: string, descripcion: string): Promise<void>;
  create(dto: CreateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado>;
  update(id: number, dto: UpdateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado>;
  softDelete(id: number, actor: AuthenticatedUser): Promise<Empleado>;
  getCargoActual(empleadoId: number): Promise<CargoSalario | null>;
  getHistorialCargos(empleadoId: number): Promise<CargoSalario[]>;
  getContratoLaboralActivo(empleadoId: number, authorizationHeader: string): Promise<ActiveContractDocument | null>;
  crearCargo(empleadoId: number, dto: CreateCargoDto, actor: AuthenticatedUser): Promise<CargoSalario>;
  getDocumentos(empleadoId: number): Promise<DocumentoEmpleado[]>;
  generarPresignedUrl(dto: PresignedUrlDto): Promise<{ url: string; key: string }>;
  confirmarDocumento(empleadoId: number, dto: ConfirmarDocumentoDto, actor: AuthenticatedUser): Promise<DocumentoEmpleado>;
  generarUrlDescargaDocumento(docId: number): Promise<{ url: string; expires_in: number }>;
  aprobarDocumento(documentoId: number, actor: AuthenticatedUser): Promise<DocumentoEmpleado>;
  rechazarDocumento(documentoId: number, motivo: string, actor: AuthenticatedUser): Promise<DocumentoEmpleado>;
  exportCsv(filters?: EmployeeFilters): Promise<string>;
  solicitarCorreccion(empleadoId: number, descripcion: string, solicitante: string): Promise<void>;
  getDepartamentos(): Promise<Array<{ id: number; nombre: string; codigo_dane?: string }>>;
}
