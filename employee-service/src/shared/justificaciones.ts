export const JUSTIFICACIONES_ESTADO_INACTIVO = [
  'Incapacidad',
  'Vacaciones',
  'Suspensión',
  'Licencia',
  'Otro',
] as const;

export type JustificacionEstadoInactivo = typeof JUSTIFICACIONES_ESTADO_INACTIVO[number];