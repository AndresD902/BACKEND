import { z } from 'zod';

export const createAdminSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  email:  z.string().trim().email().toLowerCase(),
});

export type CreateAdminDto = z.infer<typeof createAdminSchema>;
