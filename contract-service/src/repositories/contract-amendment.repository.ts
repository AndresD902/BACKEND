import type { QueryResult } from 'pg';
import { pool } from '../config/database';
import type { CreateContractAmendmentDto } from '../dtos/create-contract-amendment.dto';

export interface ContractAmendment {
  id: number;
  contractId: number;
  amendmentNumber: number;
  description: string;
  changes: unknown | null;
  fileS3Key: string | null;
  fileS3Url: string | null;
  effectiveDate: Date;
  createdBy: string | null;
  createdAt: Date;
}

interface ContractAmendmentRow {
  id: number | string;
  contrato_id: number | string;
  numero_adenda: number;
  descripcion: string;
  cambios_json: unknown | null;
  archivo_s3_key: string | null;
  archivo_s3_url: string | null;
  fecha_vigencia: Date;
  creado_por: string | null;
  fecha_creacion: Date;
}

function mapContractAmendmentRow(row: ContractAmendmentRow): ContractAmendment {
  return {
    id: Number(row.id),
    contractId: Number(row.contrato_id),
    amendmentNumber: row.numero_adenda,
    description: row.descripcion,
    changes: row.cambios_json,
    fileS3Key: row.archivo_s3_key,
    fileS3Url: row.archivo_s3_url,
    effectiveDate: row.fecha_vigencia,
    createdBy: row.creado_por,
    createdAt: row.fecha_creacion,
  };
}

export class ContractAmendmentRepository {
  public async create(contractId: number, amendmentNumber: number, data: CreateContractAmendmentDto): Promise<ContractAmendment> {
    const result: QueryResult<ContractAmendmentRow> = await pool.query(
      `
      INSERT INTO adendas_contratos (
        contrato_id,
        numero_adenda,
        descripcion,
        cambios_json,
        archivo_s3_key,
        archivo_s3_url,
        fecha_vigencia,
        creado_por
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        contractId,
        amendmentNumber,
        data.description,
        data.changes ? JSON.stringify(data.changes) : null,
        data.fileS3Key,
        data.fileS3Url,
        data.effectiveDate,
        data.createdBy,
      ],
    );

    return mapContractAmendmentRow(result.rows[0]);
  }

  public async findByContractId(contractId: number): Promise<ContractAmendment[]> {
    const result: QueryResult<ContractAmendmentRow> = await pool.query(
      `
      SELECT *
      FROM adendas_contratos
      WHERE contrato_id = $1
      ORDER BY numero_adenda ASC
      `,
      [contractId],
    );

    return result.rows.map(mapContractAmendmentRow);
  }

  public async findNextAmendmentNumber(contractId: number): Promise<number> {
    const result = await pool.query<{ next_number: number }>(
      `
      SELECT COALESCE(MAX(numero_adenda), 0) + 1 AS next_number
      FROM adendas_contratos
      WHERE contrato_id = $1
      `,
      [contractId],
    );

    return Number(result.rows[0].next_number);
  }

  public async findById(id: number): Promise<ContractAmendment | null> {
    const result: QueryResult<ContractAmendmentRow> = await pool.query(
      `
      SELECT *
      FROM adendas_contratos
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapContractAmendmentRow(result.rows[0]);
  }
}

export const contractAmendmentRepository = new ContractAmendmentRepository();
