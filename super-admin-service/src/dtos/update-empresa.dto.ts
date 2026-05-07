import { z } from 'zod';
import { Plan } from '../shared/enums/plan.enum';
import { EstadoEmpresa } from '../shared/enums/estado-empresa.enum';

export const updateEmpresaSchema = z.object({
  nombre:   z.string().trim().min(2).max(150).optional(),
  correo:   z.string().trim().email().toLowerCase().optional(),
  telefono: z.string().trim().max(20).optional(),
  plan:     z.nativeEnum(Plan).optional(),
});

export const updateEstadoSchema = z.object({
  estado: z.nativeEnum(EstadoEmpresa),
});

export type UpdateEmpresaDto    = z.infer<typeof updateEmpresaSchema>;
export type UpdateEstadoDto     = z.infer<typeof updateEstadoSchema>;
