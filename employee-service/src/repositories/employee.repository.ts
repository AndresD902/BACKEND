import { pool } from '../config/database';
import { Empleado } from '../entities/employee.entity';
import { EmployeeFilters } from './interfaces/employee.repository.interface';

function buildWhere(filters?: EmployeeFilters): { clause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.empresaId) {
    values.push(filters.empresaId);
    conditions.push(`empresa_id = $${values.length}`);
  }

  if (filters?.estado) {
    values.push(filters.estado);
    conditions.push(`estado = $${values.length}`);
  }

  if (filters?.departamento) {
    values.push(filters.departamento);
    conditions.push(`LOWER(departamento) = LOWER($${values.length})`);
  }

  if (filters?.search) {
    const term = `%${filters.search.toLowerCase()}%`;
    values.push(term);
    conditions.push(
      `(LOWER(nombre) LIKE $${values.length} OR LOWER(apellido) LIKE $${values.length} OR cedula LIKE $${values.length})`
    );
  }

  const clause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, values };
}

export class EmployeeRepository {
  async findAll(limit: number, offset: number, filters?: EmployeeFilters): Promise<Empleado[]> {
    const { clause, values } = buildWhere(filters);
    const limitIdx  = values.length + 1;
    const offsetIdx = values.length + 2;
    const { rows } = await pool.query<Empleado>(
      `SELECT * FROM empleados ${clause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...values, limit, offset],
    );
    return rows;
  }

  async count(filters?: EmployeeFilters): Promise<number> {
    const { clause, values } = buildWhere(filters);
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM empleados ${clause}`,
      values,
    );
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

  async findByAnyEmail(email: string): Promise<Empleado | null> {
    const normalized = email.toLowerCase();
    const { rows } = await pool.query<Empleado>(
      'SELECT * FROM empleados WHERE correo_corporativo = $1 OR correo_personal = $1 LIMIT 1',
      [normalized],
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

  async updateEstadoByCorreo(correo: string, estado: string): Promise<void> {
    await pool.query(
      `UPDATE empleados SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE correo_corporativo = $2`,
      [estado, correo.toLowerCase()],
    );
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

  async findAllDepartamentos(): Promise<Array<{ id: number; nombre: string; codigo_dane?: string }>> {
    const { rows } = await pool.query<{ id: number; nombre: string; codigo_dane?: string }>(
      'SELECT id, nombre, codigo_dane FROM departamentos WHERE activo = TRUE ORDER BY nombre ASC',
    );
    return rows;
  }
}

export const employeeRepository = new EmployeeRepository();
