import { z } from 'zod';
import { ContractStatus, ContractStatusValues } from '../shared/enums/contract-status.enum';
import { ContractTypeValues } from '../shared/enums/contract-type.enum';
import { PaymentFrequencyValues } from '../shared/enums/payment-frequency.enum';
import { PaymentMethodValues } from '../shared/enums/payment-method.enum';
import { WorkMode, WorkModeValues } from '../shared/enums/work-mode.enum';
import { WorkSchedule, WorkScheduleValues } from '../shared/enums/work-schedule.enum';

export const createContractSchema = z.object({
  employeeId: z
    .number()
    .int({ message: 'Employee id must be an integer' })
    .positive({ message: 'Employee id must be greater than zero' }),

  type: z.enum(ContractTypeValues, {
    message: 'Invalid contract type',
  }),

  salary: z.number().positive({ message: 'Salary must be greater than zero' }),

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
});

export type CreateContractDto = z.infer<typeof createContractSchema>;
