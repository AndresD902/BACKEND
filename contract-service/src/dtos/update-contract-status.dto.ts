import { z } from 'zod';
import { ContractStatusValues } from '../shared/enums/contract-status.enum';

export const updateContractStatusSchema = z.object({
  status: z.enum(ContractStatusValues, {
    message: 'Invalid contract status',
  }),
});

export type UpdateContractStatusDto = z.infer<typeof updateContractStatusSchema>;
