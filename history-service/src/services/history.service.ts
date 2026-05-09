import { historialCambiosRepository, CreateCambioData, FiltrosCambios } from '../repositories/historialCambios.repository';
import { accionesSistemaRepository, CreateAccionData, FiltrosAcciones } from '../repositories/accionesSistema.repository';
import { HistorialCambio } from '../entities/historial-cambio.entity';
import { AccionSistema } from '../entities/accion-sistema.entity';

class HistoryService {
  async registrarCambio(data: CreateCambioData): Promise<HistorialCambio> {
    return historialCambiosRepository.create(data);
  }

  async registrarAccion(data: CreateAccionData): Promise<AccionSistema> {
    return accionesSistemaRepository.create(data);
  }

  async getCambiosPorEmpleado(
    empleadoId: number,
    filtros: FiltrosCambios,
  ): Promise<{ cambios: HistorialCambio[]; total: number }> {
    const [cambios, total] = await Promise.all([
      historialCambiosRepository.findByEmpleado(empleadoId, filtros),
      historialCambiosRepository.countByEmpleado(empleadoId, filtros),
    ]);
    return { cambios, total };
  }

  async getCambios(
    filtros: FiltrosCambios,
  ): Promise<{ cambios: HistorialCambio[]; total: number }> {
    const [cambios, total] = await Promise.all([
      historialCambiosRepository.findAll(filtros),
      historialCambiosRepository.count(filtros),
    ]);
    return { cambios, total };
  }

  async getAcciones(
    filtros: FiltrosAcciones,
  ): Promise<{ acciones: AccionSistema[]; total: number }> {
    const [acciones, total] = await Promise.all([
      accionesSistemaRepository.findAll(filtros),
      accionesSistemaRepository.count(filtros),
    ]);
    return { acciones, total };
  }
}

export const historyService = new HistoryService();
