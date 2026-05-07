export interface DiasDisponibles {
  id: number;
  empleadoId: number;
  anio: number;
  diasTotales: number;
  diasUsados: number;
  diasPendientes: number;
  diasDisponibles: number;
  fechaCreacion: Date;
  fechaActualizacion: Date;
}
