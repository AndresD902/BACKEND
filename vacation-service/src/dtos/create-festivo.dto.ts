import { z } from 'zod';

/** Validation schema for creating a new public holiday. */
export const createFestivoSchema = z.object({
  fecha:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  descripcion: z.string().trim().min(1).max(200, 'La descripción no puede superar 200 caracteres'),
  anio:        z.number().int().min(1900).max(2100),
  tipo:        z.enum(['nacional', 'regional', 'empresarial']).optional(),
  activo:      z.boolean().optional().default(true),
});

export type CreateFestivoDto = z.infer<typeof createFestivoSchema>;
