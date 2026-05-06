import { z } from 'zod';
import { ContractStatus, ContractStatusValues } from '../shared/enums/contract-status.enum';
import { ContractTypeValues } from '../shared/enums/contract-type.enum';
import { PaymentFrequencyValues } from '../shared/enums/payment-frequency.enum';
import { PaymentMethodValues } from '../shared/enums/payment-method.enum';
import { WorkMode, WorkModeValues } from '../shared/enums/work-mode.enum';
import { WorkSchedule, WorkScheduleValues } from '../shared/enums/work-schedule.enum';

function normalizeCreateContractInput(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const input = value as Record<string, unknown>;

  return {
    employeeId: input.employeeId ?? input.empleado_id,
    type: input.type ?? input.tipo,
    salary: input.salary ?? input.salario,
    currency: input.currency ?? input.moneda,
    startDate: input.startDate ?? input.fecha_inicio,
    endDate: input.endDate ?? input.fecha_fin,
    paymentMethod: input.paymentMethod ?? input.metodo_pago,
    paymentFrequency: input.paymentFrequency ?? input.periodicidad_pago,
    workplace: input.workplace ?? input.lugar_trabajo,
    workMode: input.workMode ?? input.modalidad,
    workSchedule: input.workSchedule ?? input.jornada,
    fileS3Key: input.fileS3Key ?? input.archivo_s3_key,
    fileS3Url: input.fileS3Url ?? input.fileS3URL ?? input.archivo_s3_url,
    status: input.status ?? input.estado,
    createdBy: input.createdBy ?? input.creado_por,
  };
}

export const createContractSchema = z.preprocess(normalizeCreateContractInput, z.object({
  employeeId: z
    .coerce
    .number()
    .int({ message: 'Employee id must be an integer' })
    .positive({ message: 'Employee id must be greater than zero' }),

  type: z.enum(ContractTypeValues, {
    message: 'Invalid contract type',
  }),

  salary: z.coerce.number().positive({ message: 'Salary must be greater than zero' }),

  currency: z
    .string()
    .trim()
    .min(1, { message: 'Currency is required' })
    .max(10, { message: 'Currency must be at most 10 characters long' })
    .default('COP'),

  startDate: z.string().trim().min(1, { message: 'Start date is required' }),

  endDate: z.string().trim().optional().nullable(),

  paymentMethod: z
    .enum(PaymentMethodValues, {
      message: 'Invalid payment method',
    })
    .optional()
    .nullable(),

  paymentFrequency: z
    .enum(PaymentFrequencyValues, {
      message: 'Invalid payment frequency',
    })
    .optional()
    .nullable(),

  workplace: z
    .string()
    .trim()
    .max(150, { message: 'Workplace must be at most 150 characters long' })
    .optional()
    .nullable(),

  workMode: z
    .enum(WorkModeValues, {
      message: 'Invalid work mode',
    })
    .default(WorkMode.ON_SITE),

  workSchedule: z
    .enum(WorkScheduleValues, {
      message: 'Invalid work schedule',
    })
    .default(WorkSchedule.FULL_TIME),

  fileS3Key: z.string().trim().optional().nullable(),

  fileS3Url: z.string().trim().url({ message: 'File S3 URL must be a valid URL' }).optional().nullable(),

  status: z
    .enum(ContractStatusValues, {
      message: 'Invalid contract status',
    })
    .default(ContractStatus.ACTIVE),

  createdBy: z
    .string()
    .trim()
    .max(150, { message: 'Created by must be at most 150 characters long' })
    .optional()
    .nullable(),
}));

export type CreateContractDto = z.infer<typeof createContractSchema>;
