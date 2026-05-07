import { pool } from '../config/database';
import { Empresa } from '../entities/empresa.entity';
import { EstadoEmpresa } from '../shared/enums/estado-empresa.enum';

export const empresaRepository = {
  async findAll(page = 1, limit = 20): Promise<{ empresas: Empresa[]; total: number }> {
    const offset = (page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query<Empresa>(
        'SELECT * FROM empresas ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      ),
      pool.query<{ count: string }>('SELECT COUNT(*) FROM empresas'),
    ]);
    return { empresas: rows, total: Number(countRows[0].count) };
  },

  async findById(id: number): Promise<Empresa | null> {
    const { rows } = await pool.query<Empresa>(
      'SELECT * FROM empresas WHERE id = $1 LIMIT 1',
      [id],
    );
    return rows[0] ?? null;
  },

  async findByNit(nit: string): Promise<Empresa | null> {
    const { rows } = await pool.query<Empresa>(
      'SELECT * FROM empresas WHERE nit = $1 LIMIT 1',
      [nit],
    );
    return rows[0] ?? null;
  },

  async create(data: {
    nombre:   string;
    nit:      string;
    correo:   string;
    telefono?: string;
    plan:     string;
  }): Promise<Empresa> {
    const { rows } = await pool.query<Empresa>(
      `INSERT INTO empresas (nombre, nit, correo, telefono, plan)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.nombre, data.nit, data.correo, data.telefono ?? null, data.plan],
    );
    return rows[0];
  },

  async update(id: number, data: {
    nombre?:   string;
    correo?:   string;
    telefono?: string;
    plan?:     string;
  }): Promise<Empresa | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.nombre   !== undefined) { fields.push(`nombre = $${idx++}`);   values.push(data.nombre); }
    if (data.correo   !== undefined) { fields.push(`correo = $${idx++}`);   values.push(data.correo); }
    if (data.telefono !== undefined) { fields.push(`telefono = $${idx++}`); values.push(data.telefono); }
    if (data.plan     !== undefined) { fields.push(`plan = $${idx++}`);     values.push(data.plan); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query<Empresa>(
      `UPDATE empresas SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return rows[0] ?? null;
  },

  async updateEstado(id: number, estado: EstadoEmpresa): Promise<Empresa | null> {
    const { rows } = await pool.query<Empresa>(
      'UPDATE empresas SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [estado, id],
    );
    return rows[0] ?? null;
  },
};
