import { employeeRepository } from '../repositories/employee.repository';
import { cargoSalarioRepository } from '../repositories/cargoSalario.repository';
import { documentoRepository } from '../repositories/documento.repository';
import { generarUrlSubida, generarUrlDescarga } from '../config/s3';
import { registrarCambio } from '../clients/historyServiceClient';
import { notificarCambioEmpleado } from '../clients/authNotificationClient';
import { ActiveContractDocument, contractServiceClient, IContractServiceClient } from '../clients/contractServiceClient';
import { IEmployeeRepository } from '../repositories/interfaces/employee.repository.interface';
import { EmployeeFilters } from '../repositories/interfaces/employee.repository.interface';
import { ICargoSalarioRepository } from '../repositories/interfaces/cargo-salario.repository.interface';
import { IDocumentoRepository } from '../repositories/interfaces/documento.repository.interface';
import { IEmployeeService } from './interfaces/employee.service.interface';
import { NotFoundError } from '../shared/errors/not-found.error';
import { ConflictError } from '../shared/errors/conflict.error';
import { CreateEmpleadoDto } from '../dtos/create-employee.dto';
import { UpdateEmpleadoDto, CreateCargoDto, ConfirmarDocumentoDto, PresignedUrlDto } from '../dtos/update-employee.dto';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { Empleado, CargoSalario, DocumentoEmpleado } from '../entities/employee.entity';

type GenerarUrlSubidaFn = typeof generarUrlSubida;
type GenerarUrlDescargaFn = typeof generarUrlDescarga;
type RegistrarCambioFn = typeof registrarCambio;
type NotificarCambioFn = typeof notificarCambioEmpleado;

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
  ) {}

  private async findOrFail(id: number): Promise<Empleado> {
    const empleado = await this.empRepo.findById(id);
    if (!empleado) throw new NotFoundError(`Empleado con id ${id} no encontrado`);
    return empleado;
  }

  // ─── Empleados ─────────────────────────────────────────────────────────────

  async getAll(page: number, limit: number, filters?: EmployeeFilters) {
    const offset = (page - 1) * limit;
    const [empleados, total] = await Promise.all([
      this.empRepo.findAll(limit, offset, filters),
      this.empRepo.count(filters),
    ]);
    return { empleados, total, page, limit };
  }

  async getById(id: number): Promise<Empleado> {
    return this.findOrFail(id);
  }

  async create(dto: CreateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado> {
    const [existeCedula, existeCorreo] = await Promise.all([
      dto.cedula ? this.empRepo.findByCedula(dto.cedula) : Promise.resolve(null),
      this.empRepo.findByCorreoCorporativo(dto.correo_corporativo),
    ]);

    if (existeCedula) throw new ConflictError(`Ya existe un empleado con cédula ${dto.cedula}`);
    if (existeCorreo) throw new ConflictError(`Ya existe un empleado con correo ${dto.correo_corporativo}`);

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

    const empleado = await this.empRepo.create(empleadoData);

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
    const antes = await this.findOrFail(id);

    if (dto.cedula && dto.cedula !== antes.cedula) {
      const existe = await this.empRepo.findByCedula(dto.cedula);
      if (existe) throw new ConflictError(`La cédula ${dto.cedula} ya está en uso`);
    }

    if (dto.correo_corporativo && dto.correo_corporativo !== antes.correo_corporativo) {
      const existe = await this.empRepo.findByCorreoCorporativo(dto.correo_corporativo);
      if (existe) throw new ConflictError(`El correo ${dto.correo_corporativo} ya está en uso`);
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
    await this.findOrFail(id);
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

  async getCargoActual(empleadoId: number): Promise<CargoSalario | null> {
    await this.findOrFail(empleadoId);
    return this.cargoRepo.findActivo(empleadoId);
  }

  async getHistorialCargos(empleadoId: number): Promise<CargoSalario[]> {
    await this.findOrFail(empleadoId);
    return this.cargoRepo.findAll(empleadoId);
  }

  async getContratoLaboralActivo(empleadoId: number, authorizationHeader: string): Promise<ActiveContractDocument | null> {
    await this.findOrFail(empleadoId);
    return this.contractClient.getActiveContractForEmployee(empleadoId, authorizationHeader);
  }

  async crearCargo(empleadoId: number, dto: CreateCargoDto, actor: AuthenticatedUser): Promise<CargoSalario> {
    await this.findOrFail(empleadoId);

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

  async getDocumentos(empleadoId: number): Promise<DocumentoEmpleado[]> {
    await this.findOrFail(empleadoId);
    return this.docRepo.findAll(empleadoId);
  }

  async generarPresignedUrl(dto: PresignedUrlDto): Promise<{ url: string; key: string }> {
    return this.urlSubida(dto.empleado_id, dto.tipo, dto.contentType);
  }

  async confirmarDocumento(
    empleadoId: number,
    dto: ConfirmarDocumentoDto,
    actor: AuthenticatedUser,
  ): Promise<DocumentoEmpleado> {
    await this.findOrFail(empleadoId);
    await this.docRepo.desactivarPorTipo(empleadoId, dto.tipo);

    return this.docRepo.create({
      empleado_id:    empleadoId,
      tipo:           dto.tipo,
      s3_key:         dto.s3_key,
      s3_url:         dto.s3_url,
      mime_type:      dto.mime_type ?? null,
      tamano_bytes:   dto.tamano_bytes ?? null,
      nombre_archivo: dto.nombre_archivo ?? null,
      activo:         true,
      subido_por:     actor.email,
    });
  }

  async generarUrlDescargaDocumento(docId: number): Promise<{ url: string; expires_in: number }> {
    const doc = await this.docRepo.findById(docId);
    if (!doc) throw new NotFoundError(`Documento con id ${docId} no encontrado`);
    const url = await this.urlDescarga(doc.s3_key);
    return { url, expires_in: 3600 };
  }

  async exportCsv(filters?: EmployeeFilters): Promise<string> {
    const empleados = await this.empRepo.findAll(10000, 0, filters);
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
}

export const employeeService = new EmployeeService();
