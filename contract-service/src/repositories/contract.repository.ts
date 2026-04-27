import { pool } from "config/database";
import { QueryResult } from "pg";
import { ContractStatus } from "../shared/enums/contract-status.enum";
import { CreateContractDto } from "../dtos/create-contract.dto";

export interface Contract {
    id: number;
    employeeId: number;
    type: string;
    salary: string;
    currency: string;
    startDate: Date;
    endDate: Date | null;
    paymentMethod: string | null
    paymentFrequency: string | null;
    workplace: string | null
    workMode: string;
    workSchedule: string
    fileS3Key: string | null;
    fileS3URL: string | null;
    status: string;
    createdBy: string | null
    createdAt: Date;
    updatedAt: Date 
}

interface ContractRow{
    id: number;
    empleado_id: number;
    tipo: string;
    salario: string;
    moneda: string;
    fecha_inicio: Date;
    fecha_fin: Date | null;
    metodo_pago: string | null;
    periodicidad_pago: string | null;
    lugar_trabajo: string | null;
    modalidad: string;
    jornada: string;
    archivo_s3_key: string | null;
    archivo_s3_url: string | null;
    estado: string;
    creado_por: string | null;
    fecha_creacion: Date;
    fecha_actualizacion: Date;

}

function mapContractRowToContract(row: ContractRow): Contract {
    return {
    id: row.id,
    employeeId: row.empleado_id,
    type: row.tipo,
    salary: row.salario,
    currency: row.moneda,
    startDate: row.fecha_inicio,
    endDate: row.fecha_fin,
    paymentMethod: row.metodo_pago,
    paymentFrequency: row.periodicidad_pago,
    workplace: row.lugar_trabajo,
    workMode: row.modalidad,
    workSchedule: row.jornada,
    fileS3Key: row.archivo_s3_key,
    fileS3URL: row.archivo_s3_url,
    status: row.estado,
    createdBy: row.creado_por,
    createdAt: row.fecha_creacion,
    updatedAt: row.fecha_actualizacion,
  };
};

export class ContractRepository {
  public async create(data: CreateContractDto): Promise<Contract> {
    const result: QueryResult<ContractRow> = await pool.query(
      `
      INSERT INTO contratos (
        empleado_id,
        tipo,
        salario,
        moneda,
        fecha_inicio,
        fecha_fin,
        metodo_pago,
        periodicidad_pago,
        lugar_trabajo,
        modalidad,
        jornada,
        archivo_s3_key,
        archivo_s3_url,
        estado,
        creado_por
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
      `,
      [
        data.employeeId,
        data.type,
        data.salary,
        data.currency,
        data.startDate,
        data.endDate,
        data.paymentMethod,
        data.paymentFrequency,
        data.workplace,
        data.workMode,
        data.workSchedule,
        data.fileS3Key,
        data.fileS3Url,
        data.status,
        data.createdBy,
      ],
    );

    return mapContractRowToContract(result.rows[0]);
  }

  public async findAll(): Promise<Contract[]> {
    const result: QueryResult<ContractRow> = await pool.query(
      `
      SELECT *
      FROM contratos
      ORDER BY fecha_creacion DESC
      `,
    );

    return result.rows.map(mapContractRowToContract);
  }

   public async findById(id: number): Promise<Contract | null> {
    const result: QueryResult<ContractRow> = await pool.query(
      `
      SELECT *
      FROM contratos
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    if (result.rows[0]) {
      return null;
    }

    return mapContractRowToContract(result.rows[0]);
  }

    public async findByEmployeeId(employeeId: number): Promise<Contract[]> {
    const result: QueryResult<ContractRow> = await pool.query(
      `
      SELECT *
      FROM contratos
      WHERE empleado_id = $1
      ORDER BY fecha_inicio DESC
      `,
      [employeeId],
    );

    return result.rows.map(mapContractRowToContract);
 } 

  public async findActiveByEmployeeId(employeeId: number): Promise<Contract | null> {
    const result: QueryResult<ContractRow> = await pool.query(
      `
      SELECT *
      FROM contratos
      WHERE empleado_id = $1
        AND estado = $2
      LIMIT 1
      `,
      [employeeId, ContractStatus.ACTIVE],
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapContractRowToContract(result.rows[0]);
  }

  public async updateStatus(id: number, status: ContractStatus): Promise<Contract | null> {
    const result: QueryResult<ContractRow> = await pool.query(
      `
      UPDATE contratos
      SET estado = $2,
          fecha_actualizacion = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [id, status],
    );

    if (!result.rows[0]) {
      return null;
    }

    return mapContractRowToContract(result.rows[0]);
  }
}

export const contractRepository = new ContractRepository();