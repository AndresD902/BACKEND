import { z } from 'zod';

/** Validation schema for rejecting a vacation request. */
export const rejectVacationSchema = z.object({
  motivo_rechazo: z
    .string()
    .trim()
    .min(1, 'El motivo de rechazo es obligatorio')
    .max(500, 'El motivo no puede superar los 500 caracteres'),
});

export type RejectVacationDto = z.infer<typeof rejectVacationSchema>;
