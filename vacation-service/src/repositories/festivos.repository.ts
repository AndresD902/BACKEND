import { Pool } from 'pg';
import { Festivo } from '../entities/festivo.entity';

function mapRow(row: Record<string, unknown>): Festivo {
  return {
    id:          row.id as number,
    fecha:       row.fecha as Date,
    descripcion: row.descripcion as string,
    anio:        row.anio as number,
    tipo:        row.tipo as Festivo['tipo'],
    activo:      row.activo as boolean,
  };
}

export class FestivosRepository {
  constructor(private readonly pool: Pool) {}

  async findByAnio(anio: number): Promise<Festivo[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM festivos WHERE anio = $1 AND activo = TRUE ORDER BY fecha ASC`,
      [anio],
    );
    return rows.map(mapRow);
  }

  async findByRango(fechaInicio: string, fechaFin: string): Promise<Festivo[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM festivos WHERE fecha BETWEEN $1 AND $2 AND activo = TRUE`,
      [fechaInicio, fechaFin],
    );
    return rows.map(mapRow);
  }

  async existeFestivo(fecha: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      `SELECT EXISTS (SELECT 1 FROM festivos WHERE fecha = $1 AND activo = TRUE) AS existe`,
      [fecha],
    );
    return rows[0].existe as boolean;
  }

  async create(data: {
    fecha: string;
    descripcion: string;
    anio: number;
    tipo?: string;
  }): Promise<Festivo> {
    const { rows } = await this.pool.query(
      `INSERT INTO festivos (fecha, descripcion, anio, tipo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.fecha, data.descripcion, data.anio, data.tipo ?? 'nacional'],
    );
    return mapRow(rows[0]);
  }
}
