import { z } from 'zod';
import { Plan } from '../shared/enums/plan.enum';

export const createEmpresaSchema = z.object({
  nombre:   z.string().trim().min(2).max(150),
  nit:      z.string().trim().min(5).max(20),
  correo:   z.string().trim().email().toLowerCase(),
  telefono: z.string().trim().max(20).optional(),
  plan:     z.nativeEnum(Plan).default(Plan.BASICO),
});

export type CreateEmpresaDto = z.infer<typeof createEmpresaSchema>;
