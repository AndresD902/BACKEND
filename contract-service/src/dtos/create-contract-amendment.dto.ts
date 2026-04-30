import { z } from 'zod';

export const contractChangeValueSchema = z.object({
  before: z.unknown().optional().nullable(),
  after: z.unknown().optional().nullable(),
});

export const createContractAmendmentSchema = z.object({
  description: z.string().trim().min(1, { message: 'Description is required' }),

  changes: z.record(z.string(), contractChangeValueSchema).optional().nullable(),

  fileS3Key: z.string().trim().optional().nullable(),

  fileS3Url: z.string().trim().url({ message: 'File S3 URL must be a valid URL' }).optional().nullable(),

  effectiveDate: z.string().trim().min(1, { message: 'Effective date is required' }),

  createdBy: z
    .string()
    .trim()
    .max(150, { message: 'Created by must be at most 150 characters long' })
    .optional()
    .nullable(),
});

export type CreateContractAmendmentDto = z.infer<typeof createContractAmendmentSchema>;
