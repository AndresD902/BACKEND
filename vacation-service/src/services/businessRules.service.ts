import { FestivosRepository } from '../repositories/festivos.repository';
import { BadRequestError } from '../shared/errors/bad-request.error';
import { toDateOnly } from '../utils/date.util';
import { calcularDiasHabiles, calcularDiasCalendario } from '../utils/vacation-days.util';

/**
 * Encapsulates all domain validation rules for vacation requests.
 * Each method throws a `BadRequestError` when the rule is violated,
 * which lets the service layer accumulate results without branching.
 */
export class BusinessRulesService {
  constructor(private readonly festivosRepo: FestivosRepository) {}

  /**
   * Calculates both working days and calendar days for the given date range,
   * excluding weekends and public holidays fetched from the database.
   */
  async calcularDias(fechaInicio: Date, fechaFin: Date): Promise<{ diasHabiles: number; diasCalendario: number }> {
    const festivos = await this.festivosRepo.findByRango(toDateOnly(fechaInicio), toDateOnly(fechaFin));
    const diasHabiles   = calcularDiasHabiles(fechaInicio, fechaFin, festivos.map((f) => f.fecha));
    const diasCalendario = calcularDiasCalendario(fechaInicio, fechaFin);
    return { diasHabiles, diasCalendario };
  }

  /**
   * Ensures the request is submitted at least one calendar month before the
   * start date, giving HR enough time to plan.
   */
  validarAnticipacion(fechaInicio: Date): void {
    const hoy = new Date();
    const fechaMinima = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()));
    fechaMinima.setUTCMonth(fechaMinima.getUTCMonth() + 1);
    if (fechaInicio < fechaMinima) {
      throw new BadRequestError('La solicitud debe realizarse con al menos 1 mes de anticipación');
    }
  }

  /** Enforces the minimum vacation length of 5 working days. */
  validarDiasMinimos(diasHabiles: number): void {
    if (diasHabiles < 5) {
      throw new BadRequestError('Las vacaciones deben ser de mínimo 5 días hábiles');
    }
  }

  /** Ensures the employee has enough remaining vacation days for the request. */
  validarDisponibilidad(diasHabiles: number, diasDisponibles: number): void {
    if (diasHabiles > diasDisponibles) {
      throw new BadRequestError(
        `El empleado solo tiene ${diasDisponibles} días disponibles y solicitó ${diasHabiles}`,
      );
    }
  }

  /**
   * Ensures the start date falls on a working day (not a weekend or public holiday).
   * Uses UTC day-of-week to stay consistent with the rest of the date utilities.
   */
  async validarFechaInicioHabil(fechaInicio: Date): Promise<void> {
    const diaSemana = fechaInicio.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) {
      throw new BadRequestError('La fecha de inicio no puede ser fin de semana ni festivo');
    }
    const esFestivo = await this.festivosRepo.existeFestivo(toDateOnly(fechaInicio));
    if (esFestivo) {
      throw new BadRequestError('La fecha de inicio no puede ser fin de semana ni festivo');
    }
  }

  /** Validates that `fechaFin` is not before `fechaInicio`. */
  validarFechasOrden(fechaInicio: Date, fechaFin: Date): void {
    if (fechaFin < fechaInicio) {
      throw new BadRequestError('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }
}
