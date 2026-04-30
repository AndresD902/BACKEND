import { pool } from '../config/database';
import { AccionSistema } from '../entities/accion-sistema.entity';

export interface CreateAccionData {
  usuario_email?: string;
  rol?: string;
  accion: string;
  entidad?: string;
  entidad_id?: number;
  resultado?: 'exitoso' | 'fallido' | 'denegado';
  detalle?: string;
  ip_origen?: string;
  user_agent?: string;
}

export interface FiltrosAcciones {
  accion?: string;
  resultado?: string;
  usuario_email?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

class AccionesSistemaRepository {
  async create(data: CreateAccionData): Promise<AccionSistema> {
    const { rows } = await pool.query<AccionSistema>(
      `INSERT INTO acciones_sistema
         (usuario_email, rol, accion, entidad, entidad_id, resultado, detalle, ip_origen, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.usuario_email ?? null,
        data.rol ?? null,
        data.accion,
        data.entidad ?? null,
        data.entidad_id ?? null,
        data.resultado ?? 'exitoso',
        data.detalle ?? null,
        data.ip_origen ?? null,
        data.user_agent ?? null,
      ],
    );
    return rows[0];
  }

  async findAll(filtros: FiltrosAcciones): Promise<AccionSistema[]> {
    const { accion, resultado, usuario_email, desde, hasta, limit = 50, offset = 0 } = filtros;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (accion)        { conditions.push(`accion = $${idx++}`);                  values.push(accion); }
    if (resultado)     { conditions.push(`resultado = $${idx++}`);               values.push(resultado); }
    if (usuario_email) { conditions.push(`usuario_email = $${idx++}`);           values.push(usuario_email); }
    if (desde)         { conditions.push(`fecha >= $${idx++}`);                  values.push(desde); }
    if (hasta)         { conditions.push(`fecha <= $${idx++}::date + 1`);        values.push(hasta); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<AccionSistema>(
      `SELECT * FROM acciones_sistema ${where}
       ORDER BY fecha DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...values, limit, offset],
    );
    return rows;
  }

  async count(filtros: FiltrosAcciones): Promise<number> {
    const { accion, resultado, usuario_email, desde, hasta } = filtros;
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (accion)        { conditions.push(`accion = $${idx++}`);        values.push(accion); }
    if (resultado)     { conditions.push(`resultado = $${idx++}`);     values.push(resultado); }
    if (usuario_email) { conditions.push(`usuario_email = $${idx++}`); values.push(usuario_email); }
    if (desde)         { conditions.push(`fecha >= $${idx++}`);        values.push(desde); }
    if (hasta)         { conditions.push(`fecha <= $${idx++}::date + 1`); values.push(hasta); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM acciones_sistema ${where}`,
      values,
    );
    return parseInt(rows[0].count, 10);
  }
}

export const accionesSistemaRepository = new AccionesSistemaRepository();
