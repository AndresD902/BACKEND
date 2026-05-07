import { DiasDisponiblesRepository } from '../repositories/diasDisponibles.repository';
import { DiasDisponibles } from '../entities/diasDisponibles.entity';
import { env } from '../config/env';
import { currentYear } from '../utils/date.util';

export class DiasDisponiblesService {
  constructor(private readonly diasRepo: DiasDisponiblesRepository) {}

  async obtenerOCrear(empleadoId: number, anio?: number): Promise<DiasDisponibles> {
    const year = anio ?? currentYear();
    const registro = await this.diasRepo.findByEmpleadoAnio(empleadoId, year);
    if (registro) return registro;
    return this.diasRepo.create(empleadoId, year, env.diasLegalesAnuales);
  }

  async obtenerPorEmpleado(empleadoId: number): Promise<DiasDisponibles | null> {
    return this.diasRepo.findByEmpleadoAnio(empleadoId, currentYear());
  }
}
