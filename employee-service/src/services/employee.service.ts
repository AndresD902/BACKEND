import { employeeRepository } from '../repositories/employee.repository';
import { cargoSalarioRepository } from '../repositories/cargoSalario.repository';
import { documentoRepository } from '../repositories/documento.repository';
import { generarUrlSubida, generarUrlDescarga } from '../config/s3';
import { registrarCambio } from '../clients/historyServiceClient';
import { notificarCambioEmpleado, notificarSolicitudCorreccion } from '../clients/authNotificationClient';
import { ActiveContractDocument, contractServiceClient, IContractServiceClient } from '../clients/contractServiceClient';
import { provisionConsultantAccount, ProvisionConsultantAccountFn } from '../clients/authAccountClient';
import { IEmployeeRepository } from '../repositories/interfaces/employee.repository.interface';
import { EmployeeFilters } from '../repositories/interfaces/employee.repository.interface';
import { ICargoSalarioRepository } from '../repositories/interfaces/cargo-salario.repository.interface';
import { IDocumentoRepository } from '../repositories/interfaces/documento.repository.interface';
import {
  employeeChangeRequestRepository,
  EmployeeChangeRequestRepository,
} from '../repositories/employeeChangeRequest.repository';
import { IEmployeeService } from './interfaces/employee.service.interface';
import { NotFoundError } from '../shared/errors/not-found.error';
import { ConflictError } from '../shared/errors/conflict.error';
import { ForbiddenError } from '../shared/errors/forbidden.error';
import { CreateEmpleadoDto } from '../dtos/create-employee.dto';
import { UpdateEmpleadoDto, CreateCargoDto, ConfirmarDocumentoDto, PresignedUrlDto } from '../dtos/update-employee.dto';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import {
  Empleado,
  CargoSalario,
  DocumentoEmpleado,
  EmployeeChangeRequest,
  EmployeeChangeRequestStatus,
} from '../entities/employee.entity';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

type GenerarUrlSubidaFn = typeof generarUrlSubida;
type GenerarUrlDescargaFn = typeof generarUrlDescarga;
type RegistrarCambioFn = typeof registrarCambio;
type NotificarCambioFn = typeof notificarCambioEmpleado;
type NotificarCorreccionFn = typeof notificarSolicitudCorreccion;

// Dependencies injected via constructor (DIP). Production code uses the real singletons
// as defaults; tests pass mocks without touching module-level state.
export class EmployeeService implements IEmployeeService {
  constructor(
    private readonly empRepo: IEmployeeRepository = employeeRepository,
    private readonly cargoRepo: ICargoSalarioRepository = cargoSalarioRepository,
    private readonly docRepo: IDocumentoRepository = documentoRepository,
    private readonly urlSubida: GenerarUrlSubidaFn = generarUrlSubida,
    private readonly urlDescarga: GenerarUrlDescargaFn = generarUrlDescarga,
    private readonly registrar: RegistrarCambioFn = registrarCambio,
    private readonly notificar: NotificarCambioFn = notificarCambioEmpleado,
    private readonly contractClient: IContractServiceClient = contractServiceClient,
    private readonly notificarCorreccion: NotificarCorreccionFn = notificarSolicitudCorreccion,
    private readonly changeRequestRepo: EmployeeChangeRequestRepository = employeeChangeRequestRepository,
    private readonly provisionConsultant: ProvisionConsultantAccountFn = provisionConsultantAccount,
  ) {}

  private assertCompanyAccess(empleado: Empleado, actor?: AuthenticatedUser): void {
    if (actor?.companyId && empleado.empresa_id && Number(empleado.empresa_id) !== actor.companyId) {
      throw new ForbiddenError('No tienes permisos para acceder a este empleado');
    }
  }

  private async findOrFail(id: number, actor?: AuthenticatedUser): Promise<Empleado> {
    const empleado = await this.empRepo.findById(id);
    if (!empleado) throw new NotFoundError(`Empleado con id ${id} no encontrado`);
    this.assertCompanyAccess(empleado, actor);
    return empleado;
  }

  private async findOwnEmployeeOrFail(userEmail: string): Promise<Empleado> {
    const empleado = await this.empRepo.findByAnyEmail(userEmail);
    if (!empleado) {
      throw new NotFoundError('Authenticated user is not registered as an employee');
    }
    return empleado;
  }

  // ─── Empleados ─────────────────────────────────────────────────────────────

  async getAll(page: number, limit: number, filters?: EmployeeFilters, actor?: AuthenticatedUser) {
    const offset = (page - 1) * limit;
    const scopedFilters = actor?.companyId ? { ...filters, empresaId: actor.companyId } : filters;
    const [empleados, total] = await Promise.all([
      this.empRepo.findAll(limit, offset, scopedFilters),
      this.empRepo.count(scopedFilters),
    ]);
    return { empleados, total, page, limit };
  }

  async getById(id: number, actor?: AuthenticatedUser): Promise<Empleado> {
    return this.findOrFail(id, actor);
  }

  async getMe(userEmail: string): Promise<Empleado> {
    return this.findOwnEmployeeOrFail(userEmail);
  }

  async getCargoActualMe(userEmail: string): Promise<CargoSalario | null> {
    const empleado = await this.findOwnEmployeeOrFail(userEmail);
    return this.cargoRepo.findActivo(empleado.id);
  }

  async getContratoLaboralActivoMe(userEmail: string, authorizationHeader: string): Promise<ActiveContractDocument | null> {
    await this.findOwnEmployeeOrFail(userEmail);
    return this.contractClient.getLatestContractForCurrentUser(authorizationHeader);
  }

  async getDocumentosMe(userEmail: string): Promise<DocumentoEmpleado[]> {
    const empleado = await this.findOwnEmployeeOrFail(userEmail);
    return this.docRepo.findAll(empleado.id);
  }

  async generarUrlDescargaDocumentoPropio(userEmail: string, docId: number): Promise<{ url: string; expires_in: number }> {
    const empleado = await this.findOwnEmployeeOrFail(userEmail);
    const doc = await this.docRepo.findById(docId);
    if (!doc) throw new NotFoundError(`Documento con id ${docId} no encontrado`);
    if (doc.empleado_id !== empleado.id) {
      throw new ForbiddenError('No tienes permisos para descargar este documento');
    }
    const url = await this.urlDescarga(doc.s3_key);
    return { url, expires_in: 3600 };
  }

  async solicitarCorreccionMe(userEmail: string, descripcion: string): Promise<void> {
    const empleado = await this.findOwnEmployeeOrFail(userEmail);
    const request = await this.changeRequestRepo.create({
      empleado_id: empleado.id,
      empresa_id: empleado.empresa_id,
      category: 'general',
      justification: descripcion,
      requested_by_email: userEmail,
    });
    this.registrar({
      empleado_id:         empleado.id,
      entidad:             'employee_change_request',
      entidad_id:          request.id,
      campo_modificado:    'creacion',
      valor_nuevo:         JSON.stringify(request),
      usuario_modificador: userEmail,
      rol_modificador:     'CONSULTATION',
    });
    this.notificarCorreccion({
      empleadoNombre: `${empleado.nombre} ${empleado.apellido}`,
      descripcion,
      solicitante: userEmail,
    });
  }

  async create(dto: CreateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado> {
    const [existeCedula, existeCorreo] = await Promise.all([
      dto.cedula ? this.empRepo.findByCedula(dto.cedula) : Promise.resolve(null),
      this.empRepo.findByCorreoCorporativo(dto.correo_corporativo),
    ]);

    if (existeCedula) throw new ConflictError(`Ya existe un empleado con cédula ${dto.cedula}`);
    if (existeCorreo) throw new ConflictError(`Ya existe un empleado con correo ${dto.correo_corporativo}`);

    // Validar razón de estado para inactivo
    const estado = (dto as any).estado;
    const razon = (dto as any).razon_estado;
    if (estado === 'inactivo' && (!razon || razon.trim() === '')) {
      throw new ConflictError('La razón de estado es requerida cuando el estado es inactivo');
    }

    const empleadoData: Record<string, unknown> = {
      tipo_documento:     dto.tipo_documento ?? 'cedula_ciudadania',
      nombre:             dto.nombre,
      apellido:           dto.apellido,
      correo_corporativo: dto.correo_corporativo.toLowerCase(),
    };
    if (dto.cedula)           empleadoData.cedula           = dto.cedula;
    if (dto.genero)           empleadoData.genero           = dto.genero;
    if (dto.fecha_nacimiento) empleadoData.fecha_nacimiento  = dto.fecha_nacimiento;
    if (dto.celular)          empleadoData.celular           = dto.celular;
    if (dto.telefono_fijo)    empleadoData.telefono_fijo     = dto.telefono_fijo;
    if (dto.correo_personal)  empleadoData.correo_personal   = dto.correo_personal;
    if (dto.direccion)        empleadoData.direccion         = dto.direccion;
    if (dto.ciudad)           empleadoData.ciudad            = dto.ciudad;
    if (dto.departamento)     empleadoData.departamento      = dto.departamento;
    if (dto.nivel_educativo)  empleadoData.nivel_educativo   = dto.nivel_educativo;
    if (dto.fecha_ingreso)    empleadoData.fecha_ingreso     = dto.fecha_ingreso;
    if (actor.companyId)      empleadoData.empresa_id         = actor.companyId;

    const empleado = await this.empRepo.create(empleadoData);

    if (actor.companyId) {
      try {
        const result = await this.provisionConsultant({ empleado, companyId: actor.companyId });
        this.registrar({
          empleado_id:         empleado.id,
          entidad:             'usuario_consultante',
          campo_modificado:    result.created ? 'creacion' : 'asociacion_existente',
          valor_nuevo:         JSON.stringify({
            email: result.email,
            companyId: actor.companyId,
            employeeId: empleado.id,
          }),
          usuario_modificador: actor.email,
          rol_modificador:     actor.rol,
        });
      } catch (error) {
        console.error('[EmployeeService] consultant account could not be provisioned:', (error as Error).message);
      }
    }

    if (dto.cargo && dto.salario) {
      await this.cargoRepo.create({
        empleado_id:    empleado.id,
        cargo:          dto.cargo,
        departamento:   dto.cargo_departamento ?? null,
        salario:        dto.salario,
        tipo_salario:   dto.tipo_salario ?? 'fijo',
        fecha_inicio:   dto.fecha_ingreso ?? new Date().toISOString().split('T')[0],
        activo:         true,
        registrado_por: actor.email,
      });
    }

    this.registrar({
      empleado_id:         empleado.id,
      entidad:             'empleado',
      campo_modificado:    'creacion',
      valor_nuevo:         JSON.stringify(empleado),
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });
    this.notificar({
      userEmail:    actor.email,
      action:       'creacion',
      employeeName: `${empleado.nombre} ${empleado.apellido}`,
    });

    return empleado;
  }

  async update(id: number, dto: UpdateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado> {
    const antes = await this.findOrFail(id, actor);

    if (dto.cedula && dto.cedula !== antes.cedula) {
      const existe = await this.empRepo.findByCedula(dto.cedula);
      if (existe) throw new ConflictError(`La cédula ${dto.cedula} ya está en uso`);
    }

    if (dto.correo_corporativo && dto.correo_corporativo !== antes.correo_corporativo) {
      const existe = await this.empRepo.findByCorreoCorporativo(dto.correo_corporativo);
      if (existe) throw new ConflictError(`El correo ${dto.correo_corporativo} ya está en uso`);
    }

    // Validar razón de estado para inactivo en actualización
    const estado = (dto as any).estado;
    const razon = (dto as any).razon_estado;
    if (estado === 'inactivo' && (!razon || razon.trim() === '')) {
      throw new ConflictError('La razón de estado es requerida cuando el estado es inactivo');
    }

    const campos: Record<string, unknown> = {};
    const camposActualizables = [
      'nombre', 'apellido', 'cedula', 'tipo_documento', 'genero', 'fecha_nacimiento',
      'celular', 'telefono_fijo', 'correo_personal', 'correo_corporativo',
      'direccion', 'ciudad', 'departamento', 'nivel_educativo',
      'fecha_ingreso', 'fecha_retiro', 'estado', 'razon_estado',
    ] as const;

    for (const campo of camposActualizables) {
      if (dto[campo] !== undefined) campos[campo] = dto[campo];
    }

    const empleado = await this.empRepo.update(id, campos);
    if (!empleado) throw new NotFoundError(`Empleado con id ${id} no encontrado`);

    this.registrar({
      empleado_id:         id,
      entidad:             'empleado',
      campo_modificado:    Object.keys(campos).join(', '),
      valor_anterior:      JSON.stringify(antes),
      valor_nuevo:         JSON.stringify(empleado),
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });
    this.notificar({
      userEmail:    actor.email,
      action:       'actualizacion',
      employeeName: `${empleado.nombre} ${empleado.apellido}`,
    });

    return empleado;
  }

  async softDelete(id: number, actor: AuthenticatedUser): Promise<Empleado> {
    await this.findOrFail(id, actor);
    const empleado = await this.empRepo.softDelete(id);
    if (!empleado) throw new NotFoundError(`Empleado con id ${id} no encontrado`);

    this.registrar({
      empleado_id:         id,
      entidad:             'empleado',
      campo_modificado:    'estado',
      valor_anterior:      'activo',
      valor_nuevo:         'retirado',
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });
    this.notificar({
      userEmail:    actor.email,
      action:       'retiro',
      employeeName: `${empleado.nombre} ${empleado.apellido}`,
    });

    return empleado;
  }

  // ─── Cargos y salarios ─────────────────────────────────────────────────────

  async getCargoActual(empleadoId: number, actor?: AuthenticatedUser): Promise<CargoSalario | null> {
    await this.findOrFail(empleadoId, actor);
    return this.cargoRepo.findActivo(empleadoId);
  }

  async getHistorialCargos(empleadoId: number, actor?: AuthenticatedUser): Promise<CargoSalario[]> {
    await this.findOrFail(empleadoId, actor);
    return this.cargoRepo.findAll(empleadoId);
  }

  async getContratoLaboralActivo(empleadoId: number, authorizationHeader: string, actor?: AuthenticatedUser): Promise<ActiveContractDocument | null> {
    await this.findOrFail(empleadoId, actor);
    return this.contractClient.getActiveContractForEmployee(empleadoId, authorizationHeader);
  }

  async crearCargo(empleadoId: number, dto: CreateCargoDto, actor: AuthenticatedUser): Promise<CargoSalario> {
    await this.findOrFail(empleadoId, actor);

    const anterior = await this.cargoRepo.findActivo(empleadoId);
    await this.cargoRepo.cerrarActivo(empleadoId);

    const nuevo = await this.cargoRepo.create({
      empleado_id:    empleadoId,
      cargo:          dto.cargo,
      departamento:   dto.departamento ?? null,
      salario:        dto.salario,
      tipo_salario:   dto.tipo_salario ?? 'fijo',
      fecha_inicio:   dto.fecha_inicio,
      activo:         true,
      motivo_cambio:  dto.motivo_cambio ?? null,
      registrado_por: actor.email,
    });

    this.registrar({
      empleado_id:         empleadoId,
      entidad:             'cargo_salario',
      entidad_id:          nuevo.id,
      campo_modificado:    'cargo,salario',
      valor_anterior:      anterior ? `${anterior.cargo} / ${anterior.salario}` : undefined,
      valor_nuevo:         `${nuevo.cargo} / ${nuevo.salario}`,
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });
    const empInfo = await this.empRepo.findById(empleadoId);
    if (empInfo) {
      this.notificar({
        userEmail:    actor.email,
        action:       'asignacion_cargo',
        employeeName: `${empInfo.nombre} ${empInfo.apellido}`,
      });
    }

    return nuevo;
  }

  // ─── Documentos S3 ─────────────────────────────────────────────────────────

  async getDocumentos(empleadoId: number, actor?: AuthenticatedUser): Promise<DocumentoEmpleado[]> {
    await this.findOrFail(empleadoId, actor);
    return this.docRepo.findAll(empleadoId);
  }

  async generarPresignedUrl(dto: PresignedUrlDto, actor?: AuthenticatedUser): Promise<{ url: string; key: string }> {
    await this.findOrFail(dto.empleado_id, actor);
    return this.urlSubida(dto.empleado_id, dto.tipo, dto.contentType);
  }

  async confirmarDocumento(
    empleadoId: number,
    dto: ConfirmarDocumentoDto,
    actor: AuthenticatedUser,
  ): Promise<DocumentoEmpleado> {
    await this.findOrFail(empleadoId, actor);

    // Validate file type
    if (dto.mime_type && !ALLOWED_MIME_TYPES.includes(dto.mime_type)) {
      throw new ConflictError(`Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Validate file size
    if (dto.tamano_bytes != null && dto.tamano_bytes > MAX_FILE_SIZE_BYTES) {
      throw new ConflictError(`El tamaño del archivo excede el límite de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`);
    }

    // Create pending document (not active yet)
    const pendingDoc = await this.docRepo.create({
      empleado_id:    empleadoId,
      tipo:           dto.tipo,
      s3_key:         dto.s3_key,
      s3_url:         dto.s3_url,
      mime_type:      dto.mime_type ?? null,
      tamano_bytes:   dto.tamano_bytes ?? null,
      nombre_archivo: dto.nombre_archivo ?? null,
      activo:         false, // pending approval
      subido_por:     actor.email,
      aprobado_por:   null,
      fecha_aprobacion: null,
    });

    // Registrar auditoría de subida pendiente de documento
    this.registrar({
      empleado_id: empleadoId,
      entidad: 'documento',
      entidad_id: pendingDoc.id,
      campo_modificado: 'subida_pendiente',
      valor_anterior: undefined,
      valor_nuevo: JSON.stringify({
        tipo: pendingDoc.tipo,
        s3_key: pendingDoc.s3_key,
        activo: pendingDoc.activo,
        subido_por: pendingDoc.subido_por,
      }),
      usuario_modificador: actor.email,
      rol_modificador: actor.rol,
    });

    return pendingDoc;
  }

  async generarUrlDescargaDocumento(docId: number, actor?: AuthenticatedUser): Promise<{ url: string; expires_in: number }> {
    const doc = await this.docRepo.findById(docId);
    if (!doc) throw new NotFoundError(`Documento con id ${docId} no encontrado`);
    await this.findOrFail(doc.empleado_id, actor);
    const url = await this.urlDescarga(doc.s3_key);
    return { url, expires_in: 3600 };
  }

  async aprobarDocumento(documentoId: number, actor: AuthenticatedUser): Promise<DocumentoEmpleado> {
    // Find the document to ensure it exists and get its employee_id and type
    const doc = await this.docRepo.findById(documentoId);
    if (!doc) {
      throw new NotFoundError(`Documento con id ${documentoId} no encontrado`);
    }
    await this.findOrFail(doc.empleado_id, actor);

    // Deactivate any other active approved document of the same type for this employee
    await this.docRepo.desactivarPorTipo(doc.empleado_id, doc.tipo);

    // Approve the document
    const approvedDoc = await this.docRepo.approve(documentoId, actor.email);
    if (!approvedDoc) {
      throw new Error(`No se pudo aprobar el documento ${documentoId}`);
    }

    // Registrar auditoría de aprobación de documento
    this.registrar({
      empleado_id: doc.empleado_id,
      entidad: 'documento',
      entidad_id: approvedDoc.id,
      campo_modificado: 'aprobacion',
      valor_anterior: JSON.stringify({
        activo: doc.activo,
        aprobado_por: doc.aprobado_por,
        fecha_aprobacion: doc.fecha_aprobacion,
      }),
      valor_nuevo: JSON.stringify({
        activo: approvedDoc.activo,
        aprobado_por: approvedDoc.aprobado_por,
        fecha_aprobacion: approvedDoc.fecha_aprobacion,
      }),
      usuario_modificador: actor.email,
      rol_modificador: actor.rol,
    });

    return approvedDoc;
  }

  async rechazarDocumento(documentoId: number, motivo: string, actor: AuthenticatedUser): Promise<DocumentoEmpleado> {
    const doc = await this.docRepo.findById(documentoId);
    if (!doc) {
      throw new NotFoundError(`Documento ${documentoId} no encontrado`);
    }
    await this.findOrFail(doc.empleado_id, actor);

    // Actualizar documento en BD con estado rechazado
    const docActualizado = await this.docRepo.update(documentoId, {
      estado: 'rechazado',
      motivo_rechazo: motivo,
    });

    if (!docActualizado) {
      throw new NotFoundError(`No se pudo actualizar el documento`);
    }

    // Registrar en History Service
    this.registrar({
      empleado_id: doc.empleado_id,
      entidad: 'documento',
      entidad_id: documentoId,
      campo_modificado: 'estado',
      valor_anterior: 'pendiente_aprobacion',
      valor_nuevo: 'rechazado',
      usuario_modificador: actor.email,
      rol_modificador: actor.rol,
    });

    return docActualizado;
  }

  async solicitarCorreccion(empleadoId: number, descripcion: string, solicitante: string, actor?: AuthenticatedUser): Promise<void> {
    const empleado = await this.findOrFail(empleadoId, actor);
    const request = await this.changeRequestRepo.create({
      empleado_id: empleado.id,
      empresa_id: empleado.empresa_id,
      category: 'general',
      justification: descripcion,
      requested_by_email: solicitante,
    });
    this.registrar({
      empleado_id:         empleado.id,
      entidad:             'employee_change_request',
      entidad_id:          request.id,
      campo_modificado:    'creacion',
      valor_nuevo:         JSON.stringify(request),
      usuario_modificador: solicitante,
      rol_modificador:     actor?.rol ?? 'CONSULTATION',
    });
    this.notificarCorreccion({
      empleadoNombre: `${empleado.nombre} ${empleado.apellido}`,
      descripcion,
      solicitante,
    });
  }

  async listChangeRequests(actor: AuthenticatedUser, status?: EmployeeChangeRequestStatus): Promise<EmployeeChangeRequest[]> {
    return this.changeRequestRepo.findAll({
      empresaId: actor.companyId,
      status,
    });
  }

  async listMyChangeRequests(userEmail: string, status?: EmployeeChangeRequestStatus): Promise<EmployeeChangeRequest[]> {
    const empleado = await this.findOwnEmployeeOrFail(userEmail);
    return this.changeRequestRepo.findAll({
      empleadoId: empleado.id,
      status,
    });
  }

  async reviewChangeRequest(
    id: number,
    status: Exclude<EmployeeChangeRequestStatus, 'PENDING'>,
    actor: AuthenticatedUser,
    reviewNotes?: string,
  ): Promise<EmployeeChangeRequest> {
    const request = await this.changeRequestRepo.findById(id);
    if (!request) throw new NotFoundError(`Solicitud con id ${id} no encontrada`);
    if (actor.companyId && request.empresa_id && Number(request.empresa_id) !== actor.companyId) {
      throw new ForbiddenError('No tienes permisos para revisar esta solicitud');
    }
    const updated = await this.changeRequestRepo.review(id, status, actor.email, reviewNotes);
    if (!updated) throw new NotFoundError(`Solicitud con id ${id} no encontrada`);
    this.registrar({
      empleado_id:         request.empleado_id,
      entidad:             'employee_change_request',
      entidad_id:          id,
      campo_modificado:    'status',
      valor_anterior:      request.status,
      valor_nuevo:         status,
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });
    return updated;
  }

  async exportCsv(filters?: EmployeeFilters, actor?: AuthenticatedUser): Promise<string> {
    const scopedFilters = actor?.companyId ? { ...filters, empresaId: actor.companyId } : filters;
    const empleados = await this.empRepo.findAll(10000, 0, scopedFilters);
    const HEADERS = [
      'ID', 'Cédula', 'Tipo Documento', 'Nombre', 'Apellido', 'Género',
      'Fecha Nacimiento', 'Celular', 'Teléfono Fijo', 'Correo Personal',
      'Correo Corporativo', 'Dirección', 'Ciudad', 'Departamento',
      'Nivel Educativo', 'Estado', 'Razón Estado',
      'Fecha Ingreso', 'Fecha Retiro', 'Creado En',
    ];
    const escape = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = empleados.map(e => [
      e.id, e.cedula, e.tipo_documento, e.nombre, e.apellido, e.genero,
      e.fecha_nacimiento, e.celular, e.telefono_fijo, e.correo_personal,
      e.correo_corporativo, e.direccion, e.ciudad, e.departamento,
      e.nivel_educativo, e.estado, e.razon_estado,
      e.fecha_ingreso, e.fecha_retiro, e.created_at,
    ].map(escape).join(','));
    return [HEADERS.join(','), ...rows].join('\r\n');
  }

  async getDepartamentos(): Promise<Array<{ id: number; nombre: string; codigo_dane?: string }>> {
    const departamentos = await this.empRepo.findAllDepartamentos();
    return departamentos;
  }
}

export const employeeService = new EmployeeService();
