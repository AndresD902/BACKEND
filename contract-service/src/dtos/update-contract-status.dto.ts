import { z } from 'zod';
import { ContractStatusValues } from '../shared/enums/contract-status.enum';

function normalizeUpdateContractStatusInput(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const input = value as Record<string, unknown>;

  return {
    status: input.status ?? input.estado,
  };
}

export const updateContractStatusSchema = z.preprocess(normalizeUpdateContractStatusInput, z.object({
  status: z.enum(ContractStatusValues, {
    message: 'Invalid contract status',
  }),
}));

export type UpdateContractStatusDto = z.infer<typeof updateContractStatusSchema>;
