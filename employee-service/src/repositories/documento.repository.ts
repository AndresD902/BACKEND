import { pool } from '../config/database';
import { DocumentoEmpleado } from '../entities/employee.entity';

export class DocumentoRepository {
  async findAll(empleadoId: number): Promise<DocumentoEmpleado[]> {
    const { rows } = await pool.query<DocumentoEmpleado>(
      'SELECT * FROM documentos_empleado WHERE empleado_id = $1 ORDER BY created_at DESC',
      [empleadoId],
    );
    return rows;
  }

  async findById(id: number): Promise<DocumentoEmpleado | null> {
    const { rows } = await pool.query<DocumentoEmpleado>(
      'SELECT * FROM documentos_empleado WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  }

  async desactivarPorTipo(empleadoId: number, tipo: string): Promise<void> {
    await pool.query(
      `UPDATE documentos_empleado SET activo = FALSE
       WHERE empleado_id = $1 AND tipo = $2 AND activo = TRUE`,
      [empleadoId, tipo],
    );
  }

  async create(data: Record<string, unknown>): Promise<DocumentoEmpleado> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query<DocumentoEmpleado>(
      `INSERT INTO documentos_empleado (${cols}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    return rows[0];
  }

  async approve(documentoId: number, aprobadoPor: string): Promise<DocumentoEmpleado | null> {
    const { rows } = await pool.query<DocumentoEmpleado>(
      `UPDATE documentos_empleado
       SET activo = TRUE,
           aprobado_por = $2,
           fecha_aprobacion = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [documentoId, aprobadoPor],
    );
    return rows[0] ?? null;
  }

  async update(documentoId: number, data: Record<string, unknown>): Promise<DocumentoEmpleado | null> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows } = await pool.query<DocumentoEmpleado>(
      `UPDATE documentos_empleado SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, documentoId],
    );
    return rows[0] ?? null;
  }
}

export const documentoRepository = new DocumentoRepository();
