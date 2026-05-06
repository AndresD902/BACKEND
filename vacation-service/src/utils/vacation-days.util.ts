import { toDateOnly } from './date.util';

export function calcularDiasCalendario(fechaInicio: Date, fechaFin: Date): number {
  const diff = fechaFin.getTime() - fechaInicio.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function calcularDiasHabiles(fechaInicio: Date, fechaFin: Date, festivos: Date[]): number {
  const fechasFestivos = new Set(festivos.map(toDateOnly));
  let diasHabiles = 0;
  const cursor = new Date(fechaInicio);

  while (cursor <= fechaFin) {
    const diaSemana = cursor.getUTCDay();
    const fechaStr = toDateOnly(cursor);
    const esFinSemana = diaSemana === 0 || diaSemana === 6;
    const esFestivo = fechasFestivos.has(fechaStr);

    if (!esFinSemana && !esFestivo) diasHabiles++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return diasHabiles;
}
