import { pool } from '../config/database';
import { HistorialCambio } from '../entities/historial-cambio.entity';

export interface CreateCambioData {
  empleado_id: number;
  entidad: string;
  entidad_id?: number;
  campo_modificado: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  usuario_modificador: string;
  rol_modificador?: string;
  ip_origen?: string;
  user_agent?: string;
}

export interface FiltrosCambios {
  empleado_id?: number;
  entidad?: string;
  entidad_id?: number;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

class HistorialCambiosRepository {
  async create(data: CreateCambioData): Promise<HistorialCambio> {
    const { rows } = await pool.query<HistorialCambio>(
      `INSERT INTO historial_cambios
         (empleado_id, entidad, entidad_id, campo_modificado, valor_anterior,
          valor_nuevo, usuario_modificador, rol_modificador, ip_origen, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        data.empleado_id,
        data.entidad,
        data.entidad_id ?? null,
        data.campo_modificado,
        data.valor_anterior ?? null,
        data.valor_nuevo ?? null,
        data.usuario_modificador,
        data.rol_modificador ?? null,
        data.ip_origen ?? null,
        data.user_agent ?? null,
      ],
    );
    return rows[0];
  }

  async findByEmpleado(empleadoId: number, filtros: FiltrosCambios): Promise<HistorialCambio[]> {
    const { entidad, entidad_id, desde, hasta, limit = 50, offset = 0 } = filtros;
    const conditions: string[] = ['empleado_id = $1'];
    const values: unknown[] = [empleadoId];
    let idx = 2;

    if (entidad)    { conditions.push(`entidad = $${idx++}`);                          values.push(entidad); }
    if (entidad_id) { conditions.push(`entidad_id = $${idx++}`);                       values.push(entidad_id); }
    if (desde)      { conditions.push(`fecha_modificacion >= $${idx++}`);              values.push(desde); }
    if (hasta)      { conditions.push(`fecha_modificacion <= $${idx++}::date + 1`);   values.push(hasta); }

    const where = conditions.join(' AND ');
    const { rows } = await pool.query<HistorialCambio>(
      `SELECT * FROM historial_cambios WHERE ${where}
       ORDER BY fecha_modificacion DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset],
    );
    return rows;
  }

  async findAll(filtros: FiltrosCambios): Promise<HistorialCambio[]> {
    const { empleado_id, entidad, entidad_id, desde, hasta, limit = 50, offset = 0 } = filtros;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (empleado_id) { conditions.push(`empleado_id = $${idx++}`); values.push(empleado_id); }
    if (entidad)     { conditions.push(`entidad = $${idx++}`); values.push(entidad); }
    if (entidad_id)  { conditions.push(`entidad_id = $${idx++}`); values.push(entidad_id); }
    if (desde)       { conditions.push(`fecha_modificacion >= $${idx++}`); values.push(desde); }
    if (hasta)       { conditions.push(`fecha_modificacion <= $${idx++}::date + 1`); values.push(hasta); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<HistorialCambio>(
      `SELECT * FROM historial_cambios ${where}
       ORDER BY fecha_modificacion DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset],
    );
    return rows;
  }

  async countByEmpleado(empleadoId: number, filtros: FiltrosCambios): Promise<number> {
    const { entidad, entidad_id, desde, hasta } = filtros;
    const conditions: string[] = ['empleado_id = $1'];
    const values: unknown[] = [empleadoId];
    let idx = 2;

    if (entidad)    { conditions.push(`entidad = $${idx++}`);                        values.push(entidad); }
    if (entidad_id) { conditions.push(`entidad_id = $${idx++}`);                     values.push(entidad_id); }
    if (desde)      { conditions.push(`fecha_modificacion >= $${idx++}`);            values.push(desde); }
    if (hasta)      { conditions.push(`fecha_modificacion <= $${idx++}::date + 1`);  values.push(hasta); }

    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM historial_cambios WHERE ${conditions.join(' AND ')}`,
      values,
    );
    return parseInt(rows[0].count, 10);
  }

  async count(filtros: FiltrosCambios): Promise<number> {
    const { empleado_id, entidad, entidad_id, desde, hasta } = filtros;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (empleado_id) { conditions.push(`empleado_id = $${idx++}`); values.push(empleado_id); }
    if (entidad)     { conditions.push(`entidad = $${idx++}`); values.push(entidad); }
    if (entidad_id)  { conditions.push(`entidad_id = $${idx++}`); values.push(entidad_id); }
    if (desde)       { conditions.push(`fecha_modificacion >= $${idx++}`); values.push(desde); }
    if (hasta)       { conditions.push(`fecha_modificacion <= $${idx++}::date + 1`); values.push(hasta); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM historial_cambios ${where}`,
      values,
    );
    return parseInt(rows[0].count, 10);
  }
}

export const historialCambiosRepository = new HistorialCambiosRepository();
