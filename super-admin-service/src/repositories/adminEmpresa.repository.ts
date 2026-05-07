import { pool } from '../config/database';
import { AdminEmpresa } from '../entities/admin-empresa.entity';

export const adminEmpresaRepository = {
  async findByEmpresa(empresaId: number): Promise<AdminEmpresa[]> {
    const { rows } = await pool.query<AdminEmpresa>(
      'SELECT * FROM admins_empresa WHERE empresa_id = $1 ORDER BY creado_en ASC',
      [empresaId],
    );
    return rows;
  },

  async countByEmpresa(empresaId: number): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM admins_empresa WHERE empresa_id = $1 AND activo = TRUE',
      [empresaId],
    );
    return Number(rows[0].count);
  },

  async create(data: {
    empresa_id: number;
    email:      string;
    nombre?:    string;
  }): Promise<AdminEmpresa> {
    const { rows } = await pool.query<AdminEmpresa>(
      `INSERT INTO admins_empresa (empresa_id, email, nombre)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.empresa_id, data.email, data.nombre ?? null],
    );
    return rows[0];
  },

  async deactivate(id: number): Promise<void> {
    await pool.query('UPDATE admins_empresa SET activo = FALSE WHERE id = $1', [id]);
  },
};
