import { pool } from '../config/database';
import { EmployeeChangeRequest, EmployeeChangeRequestStatus } from '../entities/employee.entity';

export interface CreateEmployeeChangeRequestData {
  empleado_id: number;
  empresa_id?: number | null;
  category?: string;
  current_value?: string | null;
  requested_value?: string | null;
  justification: string;
  requested_by_email?: string | null;
}

export interface EmployeeChangeRequestFilters {
  empresaId?: number;
  empleadoId?: number;
  status?: EmployeeChangeRequestStatus;
}

function buildWhere(filters?: EmployeeChangeRequestFilters): { clause: string; values: unknown[] } {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters?.empresaId) {
    values.push(filters.empresaId);
    conditions.push(`empresa_id = $${values.length}`);
  }

  if (filters?.empleadoId) {
    values.push(filters.empleadoId);
    conditions.push(`empleado_id = $${values.length}`);
  }

  if (filters?.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }

  return {
    clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

export class EmployeeChangeRequestRepository {
  async create(data: CreateEmployeeChangeRequestData): Promise<EmployeeChangeRequest> {
    const { rows } = await pool.query<EmployeeChangeRequest>(
      `INSERT INTO employee_change_requests
        (empleado_id, empresa_id, category, current_value, requested_value, justification, requested_by_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.empleado_id,
        data.empresa_id ?? null,
        data.category ?? 'general',
        data.current_value ?? null,
        data.requested_value ?? null,
        data.justification,
        data.requested_by_email ?? null,
      ],
    );
    return rows[0];
  }

  async findAll(filters?: EmployeeChangeRequestFilters): Promise<EmployeeChangeRequest[]> {
    const { clause, values } = buildWhere(filters);
    const { rows } = await pool.query<EmployeeChangeRequest>(
      `SELECT * FROM employee_change_requests ${clause} ORDER BY created_at DESC`,
      values,
    );
    return rows;
  }

  async findById(id: number): Promise<EmployeeChangeRequest | null> {
    const { rows } = await pool.query<EmployeeChangeRequest>(
      'SELECT * FROM employee_change_requests WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  }

  async review(
    id: number,
    status: Exclude<EmployeeChangeRequestStatus, 'PENDING'>,
    reviewedBy: string,
    reviewNotes?: string,
  ): Promise<EmployeeChangeRequest | null> {
    const { rows } = await pool.query<EmployeeChangeRequest>(
      `UPDATE employee_change_requests
       SET status = $1,
           reviewed_by = $2,
           review_notes = $3,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, reviewedBy, reviewNotes ?? null, id],
    );
    return rows[0] ?? null;
  }
}

export const employeeChangeRequestRepository = new EmployeeChangeRequestRepository();
