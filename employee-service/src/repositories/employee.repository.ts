import { pool } from '../config/database';
import { Empleado } from '../entities/employee.entity';

export class EmployeeRepository {
  async findAll(limit: number, offset: number): Promise<Empleado[]> {
    const { rows } = await pool.query<Empleado>(
      'SELECT * FROM empleados ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );
    return rows;
  }

  async count(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>('SELECT COUNT(*) FROM empleados');
    return parseInt(rows[0].count, 10);
  }

  async findById(id: number): Promise<Empleado | null> {
    const { rows } = await pool.query<Empleado>('SELECT * FROM empleados WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByCedula(cedula: string): Promise<Empleado | null> {
    const { rows } = await pool.query<Empleado>('SELECT * FROM empleados WHERE cedula = $1', [cedula]);
    return rows[0] ?? null;
  }

  async findByCorreoCorporativo(correo: string): Promise<Empleado | null> {
    const { rows } = await pool.query<Empleado>(
      'SELECT * FROM empleados WHERE correo_corporativo = $1',
      [correo.toLowerCase()],
    );
    return rows[0] ?? null;
  }

  async create(data: Record<string, unknown>): Promise<Empleado> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query<Empleado>(
      `INSERT INTO empleados (${cols}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return rows[0];
  }

  async update(id: number, data: Record<string, unknown>): Promise<Empleado | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows } = await pool.query<Empleado>(
      `UPDATE empleados SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id],
    );
    return rows[0] ?? null;
  }

  async softDelete(id: number): Promise<Empleado | null> {
    const { rows } = await pool.query<Empleado>(
      `UPDATE empleados
       SET estado = 'retirado', fecha_retiro = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id],
    );
    return rows[0] ?? null;
  }
}

export const employeeRepository = new EmployeeRepository();
