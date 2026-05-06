import { Pool } from 'pg';
import { DiasDisponibles } from '../entities/diasDisponibles.entity';

function mapRow(row: Record<string, unknown>): DiasDisponibles {
  return {
    id:                 row.id as number,
    empleadoId:         row.empleado_id as number,
    anio:               row.anio as number,
    diasTotales:        Number(row.dias_totales),
    diasUsados:         Number(row.dias_usados),
    diasPendientes:     Number(row.dias_pendientes),
    diasDisponibles:    Number(row.dias_disponibles),
    fechaCreacion:      row.fecha_creacion as Date,
    fechaActualizacion: row.fecha_actualizacion as Date,
  };
}

export class DiasDisponiblesRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmpleadoAnio(empleadoId: number, anio: number): Promise<DiasDisponibles | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM dias_disponibles WHERE empleado_id = $1 AND anio = $2`,
      [empleadoId, anio],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async create(empleadoId: number, anio: number, diasTotales: number): Promise<DiasDisponibles> {
    const { rows } = await this.pool.query(
      `INSERT INTO dias_disponibles (empleado_id, anio, dias_totales)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [empleadoId, anio, diasTotales],
    );
    return mapRow(rows[0]);
  }

  async incrementarPendientes(empleadoId: number, anio: number, dias: number): Promise<void> {
    await this.pool.query(
      `UPDATE dias_disponibles
       SET dias_pendientes = dias_pendientes + $3, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE empleado_id = $1 AND anio = $2`,
      [empleadoId, anio, dias],
    );
  }

  async aprobar(empleadoId: number, anio: number, dias: number): Promise<void> {
    await this.pool.query(
      `UPDATE dias_disponibles
       SET dias_usados = dias_usados + $3,
           dias_pendientes = dias_pendientes - $3,
           fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE empleado_id = $1 AND anio = $2`,
      [empleadoId, anio, dias],
    );
  }

  async liberarPendientes(empleadoId: number, anio: number, dias: number): Promise<void> {
    await this.pool.query(
      `UPDATE dias_disponibles
       SET dias_pendientes = dias_pendientes - $3, fecha_actualizacion = CURRENT_TIMESTAMP
       WHERE empleado_id = $1 AND anio = $2`,
      [empleadoId, anio, dias],
    );
  }
}
