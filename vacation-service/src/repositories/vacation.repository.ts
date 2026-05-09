import { Pool } from 'pg';
import { Vacation } from '../entities/vacation.entity';

function mapRow(row: Record<string, unknown>): Vacation {
  return {
    id:                 row.id as number,
    empleadoId:         row.empleado_id as number,
    fechaInicio:        row.fecha_inicio as Date,
    fechaFin:           row.fecha_fin as Date,
    diasHabiles:        row.dias_habiles as number,
    diasCalendario:     row.dias_calendario as number,
    estado:             row.estado as Vacation['estado'],
    justificacion:      row.justificacion as string | null,
    motivoRechazo:      row.motivo_rechazo as string | null,
    aprobadoPor:        row.aprobado_por as string | null,
    fechaAprobacion:    row.fecha_aprobacion as Date | null,
    notificado:         row.notificado as boolean,
    fechaSolicitud:     row.fecha_solicitud as Date,
    fechaActualizacion: row.fecha_actualizacion as Date,
  };
}

export class VacationRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(filters: {
    empleadoId?: number;
    estado?: Vacation['estado'];
    desde?: string;
    hasta?: string;
  } = {}): Promise<Vacation[]> {
    const values: unknown[] = [];
    const conditions: string[] = [];

    if (filters.empleadoId) {
      values.push(filters.empleadoId);
      conditions.push(`empleado_id = $${values.length}`);
    }

    if (filters.estado) {
      values.push(filters.estado);
      conditions.push(`estado = $${values.length}`);
    }

    if (filters.desde) {
      values.push(filters.desde);
      conditions.push(`fecha_inicio >= $${values.length}`);
    }

    if (filters.hasta) {
      values.push(filters.hasta);
      conditions.push(`fecha_fin <= $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await this.pool.query(
      `SELECT * FROM vacaciones ${where} ORDER BY fecha_solicitud DESC`,
      values,
    );

    return rows.map(mapRow);
  }

  async findByEmpleadoId(empleadoId: number): Promise<Vacation[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM vacaciones WHERE empleado_id = $1 ORDER BY fecha_solicitud DESC`,
      [empleadoId],
    );
    return rows.map(mapRow);
  }

  async findById(id: number): Promise<Vacation | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM vacaciones WHERE id = $1`,
      [id],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async create(data: {
    empleadoId: number;
    fechaInicio: string;
    fechaFin: string;
    diasHabiles: number;
    diasCalendario: number;
    justificacion?: string;
  }): Promise<Vacation> {
    const { rows } = await this.pool.query(
      `INSERT INTO vacaciones
         (empleado_id, fecha_inicio, fecha_fin, dias_habiles, dias_calendario, justificacion)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.empleadoId, data.fechaInicio, data.fechaFin, data.diasHabiles, data.diasCalendario, data.justificacion ?? null],
    );
    return mapRow(rows[0]);
  }

  async updateEstado(
    id: number,
    estado: Vacation['estado'],
    aprobadoPor: string,
    motivoRechazo?: string,
  ): Promise<Vacation> {
    const { rows } = await this.pool.query(
      `UPDATE vacaciones
       SET estado = $1, aprobado_por = $2, motivo_rechazo = $3,
           fecha_aprobacion = CURRENT_TIMESTAMP, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [estado, aprobadoPor, motivoRechazo ?? null, id],
    );
    return mapRow(rows[0]);
  }

  async markNotificado(id: number): Promise<void> {
    await this.pool.query(
      `UPDATE vacaciones SET notificado = TRUE WHERE id = $1`,
      [id],
    );
  }

  async findSolapadas(empleadoId: number, fechaInicio: string, fechaFin: string): Promise<Vacation[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM vacaciones
       WHERE empleado_id = $1
         AND estado IN ('pendiente', 'aprobada')
         AND fecha_inicio <= $3
         AND fecha_fin >= $2`,
      [empleadoId, fechaInicio, fechaFin],
    );
    return rows.map(mapRow);
  }
}
