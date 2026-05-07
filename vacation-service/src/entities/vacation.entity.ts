export type EstadoVacacion = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';

export interface Vacation {
  id: number;
  empleadoId: number;
  fechaInicio: Date;
  fechaFin: Date;
  diasHabiles: number;
  diasCalendario: number;
  estado: EstadoVacacion;
  justificacion: string | null;
  motivoRechazo: string | null;
  aprobadoPor: string | null;
  fechaAprobacion: Date | null;
  notificado: boolean;
  fechaSolicitud: Date;
  fechaActualizacion: Date;
}
