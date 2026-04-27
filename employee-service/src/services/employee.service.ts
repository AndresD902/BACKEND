import { employeeRepository } from '../repositories/employee.repository';
import { cargoSalarioRepository } from '../repositories/cargoSalario.repository';
import { documentoRepository } from '../repositories/documento.repository';
import { generarUrlSubida, generarUrlDescarga } from '../config/s3';
import { registrarCambio } from '../clients/historyServiceClient';
import { NotFoundError } from '../shared/errors/not-found.error';
import { ConflictError } from '../shared/errors/conflict.error';
import { CreateEmpleadoDto } from '../dtos/create-employee.dto';
import { UpdateEmpleadoDto, CreateCargoDto, ConfirmarDocumentoDto, PresignedUrlDto } from '../dtos/update-employee.dto';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { Empleado } from '../entities/employee.entity';

export class EmployeeService {

  private async findOrFail(id: number): Promise<Empleado> {
    const empleado = await employeeRepository.findById(id);
    if (!empleado) throw new NotFoundError(`Empleado con id ${id} no encontrado`);
    return empleado;
  }

  // ─── Empleados ─────────────────────────────────────────────────────────────

  async getAll(page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [empleados, total] = await Promise.all([
      employeeRepository.findAll(limit, offset),
      employeeRepository.count(),
    ]);
    return { empleados, total, page, limit };
  }

  async getById(id: number): Promise<Empleado> {
    return this.findOrFail(id);
  }

  async create(dto: CreateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado> {
    const [existeCedula, existeCorreo] = await Promise.all([
      employeeRepository.findByCedula(dto.cedula),
      employeeRepository.findByCorreoCorporativo(dto.correo_corporativo),
    ]);

    if (existeCedula) throw new ConflictError(`Ya existe un empleado con cédula ${dto.cedula}`);
    if (existeCorreo) throw new ConflictError(`Ya existe un empleado con correo ${dto.correo_corporativo}`);

    const empleadoData: Record<string, unknown> = {
      cedula:             dto.cedula,
      tipo_documento:     dto.tipo_documento ?? 'cedula_ciudadania',
      nombre:             dto.nombre,
      apellido:           dto.apellido,
      correo_corporativo: dto.correo_corporativo.toLowerCase(),
    };

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

    const empleado = await employeeRepository.create(empleadoData);

    if (dto.cargo && dto.salario) {
      await cargoSalarioRepository.create({
        empleado_id:     empleado.id,
        cargo:           dto.cargo,
        departamento:    dto.cargo_departamento ?? null,
        salario:         dto.salario,
        tipo_salario:    dto.tipo_salario ?? 'fijo',
        fecha_inicio:    dto.fecha_ingreso ?? new Date().toISOString().split('T')[0],
        activo:          true,
        registrado_por:  actor.email,
      });
    }

    registrarCambio({
      empleado_id:         empleado.id,
      entidad:             'empleado',
      campo_modificado:    'creacion',
      valor_nuevo:         JSON.stringify(empleado),
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });

    return empleado;
  }

  async update(id: number, dto: UpdateEmpleadoDto, actor: AuthenticatedUser): Promise<Empleado> {
    const antes = await this.findOrFail(id);

    if (dto.cedula && dto.cedula !== antes.cedula) {
      const existe = await employeeRepository.findByCedula(dto.cedula);
      if (existe) throw new ConflictError(`La cédula ${dto.cedula} ya está en uso`);
    }

    if (dto.correo_corporativo && dto.correo_corporativo !== antes.correo_corporativo) {
      const existe = await employeeRepository.findByCorreoCorporativo(dto.correo_corporativo);
      if (existe) throw new ConflictError(`El correo ${dto.correo_corporativo} ya está en uso`);
    }

    const campos: Record<string, unknown> = {};
    const camposActualizables = [
      'nombre', 'apellido', 'cedula', 'tipo_documento', 'genero', 'fecha_nacimiento',
      'celular', 'telefono_fijo', 'correo_personal', 'correo_corporativo',
      'direccion', 'ciudad', 'departamento', 'nivel_educativo',
      'fecha_ingreso', 'fecha_retiro', 'estado',
    ] as const;

    for (const campo of camposActualizables) {
      if (dto[campo] !== undefined) campos[campo] = dto[campo];
    }

    const empleado = await employeeRepository.update(id, campos);
    if (!empleado) throw new NotFoundError(`Empleado con id ${id} no encontrado`);

    registrarCambio({
      empleado_id:         id,
      entidad:             'empleado',
      campo_modificado:    Object.keys(campos).join(', '),
      valor_anterior:      JSON.stringify(antes),
      valor_nuevo:         JSON.stringify(empleado),
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });

    return empleado;
  }

  async softDelete(id: number, actor: AuthenticatedUser): Promise<Empleado> {
    await this.findOrFail(id);
    const empleado = await employeeRepository.softDelete(id);
    if (!empleado) throw new NotFoundError(`Empleado con id ${id} no encontrado`);

    registrarCambio({
      empleado_id:         id,
      entidad:             'empleado',
      campo_modificado:    'estado',
      valor_anterior:      'activo',
      valor_nuevo:         'retirado',
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });

    return empleado;
  }

  // ─── Cargos y salarios ─────────────────────────────────────────────────────

  async getCargoActual(empleadoId: number) {
    await this.findOrFail(empleadoId);
    return cargoSalarioRepository.findActivo(empleadoId);
  }

  async getHistorialCargos(empleadoId: number) {
    await this.findOrFail(empleadoId);
    return cargoSalarioRepository.findAll(empleadoId);
  }

  async crearCargo(empleadoId: number, dto: CreateCargoDto, actor: AuthenticatedUser) {
    await this.findOrFail(empleadoId);

    const anterior = await cargoSalarioRepository.findActivo(empleadoId);
    await cargoSalarioRepository.cerrarActivo(empleadoId);

    const nuevo = await cargoSalarioRepository.create({
      empleado_id:     empleadoId,
      cargo:           dto.cargo,
      departamento:    dto.departamento ?? null,
      salario:         dto.salario,
      tipo_salario:    dto.tipo_salario ?? 'fijo',
      fecha_inicio:    dto.fecha_inicio,
      activo:          true,
      motivo_cambio:   dto.motivo_cambio ?? null,
      registrado_por:  actor.email,
    });

    registrarCambio({
      empleado_id:         empleadoId,
      entidad:             'cargo_salario',
      entidad_id:          nuevo.id,
      campo_modificado:    'cargo,salario',
      valor_anterior:      anterior ? `${anterior.cargo} / ${anterior.salario}` : undefined,
      valor_nuevo:         `${nuevo.cargo} / ${nuevo.salario}`,
      usuario_modificador: actor.email,
      rol_modificador:     actor.rol,
    });

    return nuevo;
  }

  // ─── Documentos S3 ─────────────────────────────────────────────────────────

  async getDocumentos(empleadoId: number) {
    await this.findOrFail(empleadoId);
    return documentoRepository.findAll(empleadoId);
  }

  async generarPresignedUrl(dto: PresignedUrlDto) {
    return generarUrlSubida(dto.empleado_id, dto.tipo, dto.contentType);
  }

  async confirmarDocumento(
    empleadoId: number,
    dto: ConfirmarDocumentoDto,
    actor: AuthenticatedUser,
  ) {
    await this.findOrFail(empleadoId);
    await documentoRepository.desactivarPorTipo(empleadoId, dto.tipo);

    const documento = await documentoRepository.create({
      empleado_id:     empleadoId,
      tipo:            dto.tipo,
      s3_key:          dto.s3_key,
      s3_url:          dto.s3_url,
      mime_type:       dto.mime_type ?? null,
      tamano_bytes:    dto.tamano_bytes ?? null,
      nombre_archivo:  dto.nombre_archivo ?? null,
      activo:          true,
      subido_por:      actor.email,
    });

    return documento;
  }

  async generarUrlDescargaDocumento(docId: number) {
    const doc = await documentoRepository.findById(docId);
    if (!doc) throw new NotFoundError(`Documento con id ${docId} no encontrado`);
    const url = await generarUrlDescarga(doc.s3_key);
    return { url, expires_in: 3600 };
  }
}

export const employeeService = new EmployeeService();
