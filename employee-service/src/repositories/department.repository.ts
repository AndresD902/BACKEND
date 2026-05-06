import { pool } from '../config/database';
import { Departamento } from '../entities/department.entity';
import { IDepartamentoRepository } from './interfaces/department.repository.interface';

export class DepartamentoRepository implements IDepartamentoRepository {
  async findAll(): Promise<Departamento[]> {
    const { rows } = await pool.query<Departamento>(
      'SELECT * FROM departamentos_cargo ORDER BY nombre ASC',
    );
    return rows;
  }

  async findById(id: number): Promise<Departamento | null> {
    const { rows } = await pool.query<Departamento>(
      'SELECT * FROM departamentos_cargo WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  }

  async findByNombre(nombre: string): Promise<Departamento | null> {
    const { rows } = await pool.query<Departamento>(
      'SELECT * FROM departamentos_cargo WHERE LOWER(nombre) = LOWER($1)',
      [nombre],
    );
    return rows[0] ?? null;
  }

  async create(data: { nombre: string; descripcion?: string }): Promise<Departamento> {
    const { rows } = await pool.query<Departamento>(
      'INSERT INTO departamentos_cargo (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [data.nombre, data.descripcion ?? null],
    );
    return rows[0];
  }

  async update(id: number, data: { nombre?: string; descripcion?: string }): Promise<Departamento | null> {
    const keys   = Object.keys(data);
    const values = Object.values(data);
    if (keys.length === 0) return this.findById(id);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows } = await pool.query<Departamento>(
      `UPDATE departamentos_cargo SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id],
    );
    return rows[0] ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const { rowCount } = await pool.query(
      'DELETE FROM departamentos_cargo WHERE id = $1',
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}

export const departamentoRepository = new DepartamentoRepository();
