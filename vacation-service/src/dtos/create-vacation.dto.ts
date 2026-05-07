import { z } from 'zod';

export const createVacationSchema = z.object({
  empleado_id:  z.number().int().positive(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  fecha_fin:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  justificacion: z.string().optional(),
});

export type CreateVacationDto = z.infer<typeof createVacationSchema>;
