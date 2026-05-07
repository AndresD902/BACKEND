import { DiasDisponiblesRepository } from '../repositories/diasDisponibles.repository';
import { DiasDisponibles } from '../entities/diasDisponibles.entity';
import { env } from '../config/env';
import { currentYear } from '../utils/date.util';

/**
 * Manages the `dias_disponibles` record for each employee–year pair.
 * Records are created on first access so there is no need for a manual
 * initialisation step at the start of each calendar year.
 */
export class DiasDisponiblesService {
  constructor(private readonly diasRepo: DiasDisponiblesRepository) {}

  /**
   * Returns the existing record for the employee and year, or creates a new
   * one initialised with the legally-mandated number of annual vacation days.
   *
   * @param anio - Defaults to the current calendar year when omitted.
   */
  async obtenerOCrear(empleadoId: number, anio?: number): Promise<DiasDisponibles> {
    const year   = anio ?? currentYear();
    const registro = await this.diasRepo.findByEmpleadoAnio(empleadoId, year);
    if (registro) return registro;
    return this.diasRepo.create(empleadoId, year, env.diasLegalesAnuales);
  }

  /**
   * Returns the current-year record for the employee, or `null` if the
   * employee has not yet made a vacation request this year.
   */
  async obtenerPorEmpleado(empleadoId: number): Promise<DiasDisponibles | null> {
    return this.diasRepo.findByEmpleadoAnio(empleadoId, currentYear());
  }
}
