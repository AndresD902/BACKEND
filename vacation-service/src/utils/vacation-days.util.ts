import { toDateOnly } from './date.util';

/**
 * Counts the total calendar days between two dates, inclusive of both endpoints.
 * Uses millisecond arithmetic so it is immune to DST transitions.
 */
export function calcularDiasCalendario(fechaInicio: Date, fechaFin: Date): number {
  const diff = fechaFin.getTime() - fechaInicio.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Counts the working days between two UTC dates, inclusive, excluding
 * Saturdays, Sundays, and any dates present in the `festivos` array.
 *
 * @param festivos - Array of holiday dates to exclude (UTC midnight).
 */
export function calcularDiasHabiles(fechaInicio: Date, fechaFin: Date, festivos: Date[]): number {
  const fechasFestivos = new Set(festivos.map(toDateOnly));
  let diasHabiles = 0;
  const cursor = new Date(fechaInicio);

  while (cursor <= fechaFin) {
    const diaSemana = cursor.getUTCDay();
    const fechaStr  = toDateOnly(cursor);
    const esFinSemana = diaSemana === 0 || diaSemana === 6;
    const esFestivo   = fechasFestivos.has(fechaStr);

    if (!esFinSemana && !esFestivo) diasHabiles++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return diasHabiles;
}
