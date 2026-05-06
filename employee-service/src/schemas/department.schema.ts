import { z } from 'zod';

export const createDepartamentoSchema = z.object({
  nombre:      z.string().trim().min(2).max(100),
  descripcion: z.string().trim().max(255).optional(),
});

export const updateDepartamentoSchema = z.object({
  nombre:      z.string().trim().min(2).max(100).optional(),
  descripcion: z.string().trim().max(255).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Al menos un campo es requerido para actualizar',
});

export type CreateDepartamentoInput = z.infer<typeof createDepartamentoSchema>;
export type UpdateDepartamentoInput = z.infer<typeof updateDepartamentoSchema>;
