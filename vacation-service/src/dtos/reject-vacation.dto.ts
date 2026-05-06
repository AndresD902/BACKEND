import { z } from 'zod';

export const rejectVacationSchema = z.object({
  motivo_rechazo: z.string().min(1, 'El motivo de rechazo es obligatorio'),
});

export type RejectVacationDto = z.infer<typeof rejectVacationSchema>;
