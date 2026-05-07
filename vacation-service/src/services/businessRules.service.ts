import { FestivosRepository } from '../repositories/festivos.repository';
import { BadRequestError } from '../shared/errors/bad-request.error';
import { toDateOnly } from '../utils/date.util';
import { calcularDiasHabiles, calcularDiasCalendario } from '../utils/vacation-days.util';

export class BusinessRulesService {
  constructor(private readonly festivosRepo: FestivosRepository) {}

  async calcularDias(fechaInicio: Date, fechaFin: Date): Promise<{ diasHabiles: number; diasCalendario: number }> {
    const festivos = await this.festivosRepo.findByRango(toDateOnly(fechaInicio), toDateOnly(fechaFin));
    const diasHabiles = calcularDiasHabiles(fechaInicio, fechaFin, festivos.map((f) => f.fecha));
    const diasCalendario = calcularDiasCalendario(fechaInicio, fechaFin);
    return { diasHabiles, diasCalendario };
  }

  validarAnticipacion(fechaInicio: Date): void {
    const hoy = new Date();
    const unMes = new Date(hoy);
    unMes.setMonth(unMes.getMonth() + 1);
    if (fechaInicio < unMes) {
      throw new BadRequestError('La solicitud debe realizarse con al menos 1 mes de anticipación');
    }
  }

  validarDiasMinimos(diasHabiles: number): void {
    if (diasHabiles < 5) {
      throw new BadRequestError('Las vacaciones deben ser de mínimo 5 días hábiles');
    }
  }

  validarDisponibilidad(diasHabiles: number, diasDisponibles: number): void {
    if (diasHabiles > diasDisponibles) {
      throw new BadRequestError(
        `El empleado solo tiene ${diasDisponibles} días disponibles y solicitó ${diasHabiles}`,
      );
    }
  }

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

  validarFechasOrden(fechaInicio: Date, fechaFin: Date): void {
    if (fechaFin < fechaInicio) {
      throw new BadRequestError('La fecha de fin debe ser posterior a la fecha de inicio');
    }
  }
}
