import { z } from 'zod';

export const registerSuperAdminSchema = z.object({
  nombre:   z.string().trim().min(2).max(100),
  email:    z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(72),
});

export type RegisterSuperAdminDto = z.infer<typeof registerSuperAdminSchema>;
