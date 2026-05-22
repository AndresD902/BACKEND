import { VacationRepository } from '../repositories/vacation.repository';
import { DiasDisponiblesRepository } from '../repositories/diasDisponibles.repository';
import { FestivosRepository } from '../repositories/festivos.repository';
import { BusinessRulesService } from './businessRules.service';
import { DiasDisponiblesService } from './diasDisponibles.service';
import { EmailService } from './email.service';
import { employeeServiceClient, IEmployeeServiceClient } from '../clients/employeeServiceClient';
import { registrarCambio } from '../clients/historyServiceClient';
import { Vacation } from '../entities/vacation.entity';
import { DiasDisponibles } from '../entities/diasDisponibles.entity';
import { Festivo } from '../entities/festivo.entity';
import { NotFoundError } from '../shared/errors/not-found.error';
import { BadRequestError } from '../shared/errors/bad-request.error';
import { ConflictError } from '../shared/errors/conflict.error';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { env } from '../config/env';
import { parseDate, toDateOnly, currentYear } from '../utils/date.util';
import { AuthenticatedUser } from '../middlewares/auth.middleware';

/**
 * Orchestrates all vacation-related business operations.
 *
 * This service is the single entry point for the controller layer.
 * It delegates validation to `BusinessRulesService`, persistence to the
 * repositories, notifications to `EmailService`, and audit events to the
 * History Service (fire-and-forget via `registrarCambio`).
 */
export class VacationService {
  private readonly businessRules: BusinessRulesService;
  private readonly diasDisponiblesService: DiasDisponiblesService;

  constructor(
    private readonly vacationRepo: VacationRepository,
    private readonly diasRepo: DiasDisponiblesRepository,
    private readonly festivosRepo: FestivosRepository,
    private readonly emailService: EmailService,
    private readonly employeeClient: IEmployeeServiceClient = employeeServiceClient,
  ) {
    this.businessRules        = new BusinessRulesService(this.festivosRepo);
    this.diasDisponiblesService = new DiasDisponiblesService(this.diasRepo);
  }

  /** Returns all vacation requests for a given employee, newest first. */
  async getByEmpleadoId(empleadoId: number): Promise<Vacation[]> {
    return this.vacationRepo.findByEmpleadoId(empleadoId);
  }

  /** Returns all vacation requests, optionally filtered for reporting views. */
  async getAll(filters: {
    empleadoId?: number;
    estado?: Vacation['estado'];
    desde?: string;
    hasta?: string;
  } = {}): Promise<Vacation[]> {
    return this.vacationRepo.findAll(filters);
  }

  /**
   * Returns the current-year `dias_disponibles` record for an employee.
   * Creation is explicit so reporting views can read balances without creating
   * records for every employee they aggregate.
   */
  async getDiasDisponibles(
    empleadoId: number,
    options: { createIfMissing?: boolean } = {},
  ): Promise<DiasDisponibles> {
    const anio = currentYear();
    if (options.createIfMissing) {
      return this.diasDisponiblesService.obtenerOCrear(empleadoId, anio);
    }

    const registro = await this.diasDisponiblesService.obtenerPorEmpleado(empleadoId);
    if (!registro) {
      throw new NotFoundError(`No existe saldo de vacaciones para el empleado ${empleadoId} en ${anio}`);
    }

    return registro;
  }

  async getEligibility(
    empleadoId: number,
    authorizationHeader: string,
  ): Promise<{
    eligible: boolean;
    employeeId: number;
    eligibleFrom: string | null;
    minimumSeniorityMonths: number;
    legalAnnualDays: number;
    message: string;
  }> {
    const employee = await this.employeeClient.getCurrentEmployee(authorizationHeader);
    if (employee.id !== empleadoId) {
      throw new UnauthorizedError('El usuario no corresponde al empleado consultado');
    }

    const minimumSeniorityMonths = 12;
    const legalAnnualDays = env.diasLegalesAnuales;

    if (!employee.fecha_ingreso) {
      return {
        eligible: false,
        employeeId: empleadoId,
        eligibleFrom: null,
        minimumSeniorityMonths,
        legalAnnualDays,
        message: 'No hay fecha de ingreso registrada para calcular elegibilidad de vacaciones.',
      };
    }

    const ingreso = new Date(employee.fecha_ingreso);
    if (Number.isNaN(ingreso.getTime())) {
      return {
        eligible: false,
        employeeId: empleadoId,
        eligibleFrom: null,
        minimumSeniorityMonths,
        legalAnnualDays,
        message: 'La fecha de ingreso registrada no es valida.',
      };
    }

    const eligibleFromDate = new Date(Date.UTC(ingreso.getUTCFullYear(), ingreso.getUTCMonth(), ingreso.getUTCDate()));
    eligibleFromDate.setUTCMonth(eligibleFromDate.getUTCMonth() + minimumSeniorityMonths);

    const today = new Date();
    const todayDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const eligible = todayDate >= eligibleFromDate;

    return {
      eligible,
      employeeId: empleadoId,
      eligibleFrom: toDateOnly(eligibleFromDate),
      minimumSeniorityMonths,
      legalAnnualDays,
      message: eligible
        ? `Puedes solicitar vacaciones. Politica actual: ${legalAnnualDays} dias legales anuales.`
        : `Aun no puedes solicitar vacaciones. Estaras habilitado desde ${toDateOnly(eligibleFromDate)}.`,
    };
  }

  /**
   * Creates a new vacation request after passing all business-rule validations:
   * date order, one-month anticipation, working-day start, minimum 5 working days,
   * sufficient available days, and no overlapping active requests.
   *
   * Side effects (email, audit) happen after the DB write; neither blocks nor
   * rolls back the operation if they fail.
   */
  async create(
    data: { empleado_id: number; fecha_inicio: string; fecha_fin: string; justificacion?: string },
    actor: AuthenticatedUser,
    ip: string,
    userAgent: string,
  ): Promise<Vacation> {
    const fechaInicio = parseDate(data.fecha_inicio);
    const fechaFin    = parseDate(data.fecha_fin);

    this.businessRules.validarFechasOrden(fechaInicio, fechaFin);
    this.businessRules.validarAnticipacion(fechaInicio);
    await this.businessRules.validarFechaInicioHabil(fechaInicio);

    const { diasHabiles, diasCalendario } = await this.businessRules.calcularDias(fechaInicio, fechaFin);
    this.businessRules.validarDiasMinimos(diasHabiles);

    const anio        = fechaInicio.getUTCFullYear();
    const registroDias = await this.diasDisponiblesService.obtenerOCrear(data.empleado_id, anio);
    this.businessRules.validarDisponibilidad(diasHabiles, registroDias.diasDisponibles);

    const solapadas = await this.vacationRepo.findSolapadas(data.empleado_id, data.fecha_inicio, data.fecha_fin);
    if (solapadas.length > 0) {
      throw new ConflictError('El empleado ya tiene una solicitud activa que se solapa con estas fechas');
    }

    const solicitud = await this.vacationRepo.create({
      empleadoId:    data.empleado_id,
      fechaInicio:   data.fecha_inicio,
      fechaFin:      data.fecha_fin,
      diasHabiles,
      diasCalendario,
      justificacion: data.justificacion,
    });

    await this.diasRepo.incrementarPendientes(data.empleado_id, anio, diasHabiles);

    await this.emailService.notificarSolicitudRRHH({
      empleadoNombre: `Empleado #${data.empleado_id}`,
      fechaInicio:    data.fecha_inicio,
      fechaFin:       data.fecha_fin,
      diasHabiles,
      emailRRHH:      actor.email,
    });

    await this.vacationRepo.markNotificado(solicitud.id);

    registrarCambio({
      empleado_id:         data.empleado_id,
      tipo_accion:         'solicitud_vacaciones',
      entidad:             'vacaciones',
      entidad_id:          solicitud.id,
      campo_modificado:    'estado',
      valor_anterior:      null,
      valor_nuevo:         'pendiente',
      usuario_modificador: actor.email,
      rol_modificador:     actor.role,
      ip_origen:           ip,
      user_agent:          userAgent,
    });

    return { ...solicitud, notificado: true };
  }

  /**
   * Approves a pending vacation request, moving the reserved days from
   * `dias_pendientes` to `dias_usados`.
   */
  async aprobar(id: number, actor: AuthenticatedUser, ip: string, userAgent: string): Promise<Vacation> {
    const solicitud = await this.vacationRepo.findById(id);
    if (!solicitud) throw new NotFoundError(`Solicitud de vacaciones ${id} no encontrada`);
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestError('Solo se pueden aprobar solicitudes pendientes');
    }

    const actualizada = await this.vacationRepo.updateEstado(id, 'aprobada', actor.email);
    const anio        = actualizada.fechaInicio.getFullYear();
    await this.diasRepo.aprobar(solicitud.empleadoId, anio, solicitud.diasHabiles);

    await this.emailService.notificarAprobacion({
      empleadoNombre: `Empleado #${solicitud.empleadoId}`,
      fechaInicio:    toDateOnly(solicitud.fechaInicio),
      fechaFin:       toDateOnly(solicitud.fechaFin),
      emailRRHH:      actor.email,
    });

    registrarCambio({
      empleado_id:         solicitud.empleadoId,
      tipo_accion:         'aprobacion_vacaciones',
      entidad:             'vacaciones',
      entidad_id:          id,
      campo_modificado:    'estado',
      valor_anterior:      'pendiente',
      valor_nuevo:         'aprobada',
      usuario_modificador: actor.email,
      rol_modificador:     actor.role,
      ip_origen:           ip,
      user_agent:          userAgent,
    });

    return actualizada;
  }

  /**
   * Rejects a pending vacation request and frees the reserved days back
   * to `dias_disponibles`.
   */
  async rechazar(
    id: number,
    motivoRechazo: string,
    actor: AuthenticatedUser,
    ip: string,
    userAgent: string,
  ): Promise<Vacation> {
    const solicitud = await this.vacationRepo.findById(id);
    if (!solicitud) throw new NotFoundError(`Solicitud de vacaciones ${id} no encontrada`);
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestError('Solo se pueden rechazar solicitudes pendientes');
    }

    const actualizada = await this.vacationRepo.updateEstado(id, 'rechazada', actor.email, motivoRechazo);
    const anio        = solicitud.fechaInicio.getFullYear();
    await this.diasRepo.liberarPendientes(solicitud.empleadoId, anio, solicitud.diasHabiles);

    await this.emailService.notificarRechazo({
      empleadoNombre: `Empleado #${solicitud.empleadoId}`,
      fechaInicio:    toDateOnly(solicitud.fechaInicio),
      fechaFin:       toDateOnly(solicitud.fechaFin),
      motivoRechazo,
      emailRRHH:      actor.email,
    });

    registrarCambio({
      empleado_id:         solicitud.empleadoId,
      tipo_accion:         'rechazo_vacaciones',
      entidad:             'vacaciones',
      entidad_id:          id,
      campo_modificado:    'estado',
      valor_anterior:      'pendiente',
      valor_nuevo:         'rechazada',
      usuario_modificador: actor.email,
      rol_modificador:     actor.role,
      ip_origen:           ip,
      user_agent:          userAgent,
    });

    return actualizada;
  }

  /**
   * Cancels a pending vacation request (employee-initiated) and frees the
   * reserved days.  No email is sent for cancellations.
   */
  async cancelar(id: number, actor: AuthenticatedUser, ip: string, userAgent: string): Promise<Vacation> {
    const solicitud = await this.vacationRepo.findById(id);
    if (!solicitud) throw new NotFoundError(`Solicitud de vacaciones ${id} no encontrada`);
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestError('Solo se pueden cancelar solicitudes pendientes');
    }

    const actualizada = await this.vacationRepo.updateEstado(id, 'cancelada', actor.email);
    const anio        = solicitud.fechaInicio.getFullYear();
    await this.diasRepo.liberarPendientes(solicitud.empleadoId, anio, solicitud.diasHabiles);

    registrarCambio({
      empleado_id:         solicitud.empleadoId,
      tipo_accion:         'cancelacion_vacaciones',
      entidad:             'vacaciones',
      entidad_id:          id,
      campo_modificado:    'estado',
      valor_anterior:      'pendiente',
      valor_nuevo:         'cancelada',
      usuario_modificador: actor.email,
      rol_modificador:     actor.role,
      ip_origen:           ip,
      user_agent:          userAgent,
    });

    return actualizada;
  }

  /** Returns all active public holidays for a given year. */
  async getFestivosByAnio(anio: number): Promise<Festivo[]> {
    return this.festivosRepo.findByAnio(anio);
  }

  /** Creates a new public holiday record. */
  async createFestivo(data: {
    fecha: string;
    descripcion: string;
    anio: number;
    tipo?: string;
  }): Promise<Festivo> {
    return this.festivosRepo.create(data);
  }
}
