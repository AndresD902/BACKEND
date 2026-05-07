import { obtenerAcciones, obtenerCambios } from '../clients/historyClient';

export const auditoriaService = {
  async obtenerAcciones(token: string, params: Record<string, unknown> = {}) {
    const advertencias: string[] = [];
    let data: Record<string, unknown>[] = [];

    try {
      data = await obtenerAcciones(token, params);
    } catch (err) {
      advertencias.push(`No se pudo obtener el historial de acciones: ${(err as Error).message}`);
    }

    return { data, total: data.length, advertencias, generado_en: new Date().toISOString() };
  },

  async obtenerCambios(token: string, params: Record<string, unknown> = {}) {
    const advertencias: string[] = [];
    let data: Record<string, unknown>[] = [];

    try {
      data = await obtenerCambios(token, params);
    } catch (err) {
      advertencias.push(`No se pudo obtener el historial de cambios: ${(err as Error).message}`);
    }

    return { data, total: data.length, advertencias, generado_en: new Date().toISOString() };
  },
};
