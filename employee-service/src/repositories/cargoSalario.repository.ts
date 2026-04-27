import { pool } from '../config/database';
import { CargoSalario } from '../entities/employee.entity';

export class CargoSalarioRepository {
  async findActivo(empleadoId: number): Promise<CargoSalario | null> {
    const { rows } = await pool.query<CargoSalario>(
      `SELECT * FROM cargos_salarios
       WHERE empleado_id = $1 AND activo = TRUE
       ORDER BY fecha_inicio DESC LIMIT 1`,
      [empleadoId],
    );
    return rows[0] ?? null;
  }

  async findAll(empleadoId: number): Promise<CargoSalario[]> {
    const { rows } = await pool.query<CargoSalario>(
      'SELECT * FROM cargos_salarios WHERE empleado_id = $1 ORDER BY fecha_inicio DESC',
      [empleadoId],
    );
    return rows;
  }

  async cerrarActivo(empleadoId: number): Promise<void> {
    await pool.query(
      `UPDATE cargos_salarios
       SET activo = FALSE, fecha_fin = CURRENT_DATE
       WHERE empleado_id = $1 AND activo = TRUE`,
      [empleadoId],
    );
  }

  async create(data: Record<string, unknown>): Promise<CargoSalario> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query<CargoSalario>(
      `INSERT INTO cargos_salarios (${cols}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return rows[0];
  }
}

export const cargoSalarioRepository = new CargoSalarioRepository();
