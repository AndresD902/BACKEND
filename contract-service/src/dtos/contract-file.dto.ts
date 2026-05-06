import { z } from 'zod';

const ContractFileContentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

function normalizeContractFileUploadInput(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const input = value as Record<string, unknown>;

  return {
    employeeId: input.employeeId ?? input.empleado_id,
    contentType: input.contentType ?? input.content_type ?? input.mime_type,
    fileName: input.fileName ?? input.nombre_archivo,
  };
}

export const createContractFileUploadUrlSchema = z.preprocess(normalizeContractFileUploadInput, z.object({
  employeeId: z
    .coerce
    .number()
    .int({ message: 'Employee id must be an integer' })
    .positive({ message: 'Employee id must be greater than zero' }),

  contentType: z.enum(ContractFileContentTypes, {
    message: 'Contract file must be a PDF, DOC, or DOCX document',
  }),

  fileName: z
    .string()
    .trim()
    .max(180, { message: 'File name must be at most 180 characters long' })
    .optional()
    .nullable(),
}));

export const createContractAmendmentFileUploadUrlSchema = z.preprocess(normalizeContractFileUploadInput, z.object({
  contentType: z.enum(ContractFileContentTypes, {
    message: 'Contract amendment file must be a PDF, DOC, or DOCX document',
  }),

  fileName: z
    .string()
    .trim()
    .max(180, { message: 'File name must be at most 180 characters long' })
    .optional()
    .nullable(),
}));

export type CreateContractFileUploadUrlDto = z.infer<typeof createContractFileUploadUrlSchema>;
export type CreateContractAmendmentFileUploadUrlDto = z.infer<typeof createContractAmendmentFileUploadUrlSchema>;
