import { z } from 'zod';
import { RoleName } from '../entities/role.entity';

export const createUserSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, { message: 'First name must be at least 2 characters long' })
    .max(50, { message: 'First name must be at most 50 characters long' }),

  lastName: z
    .string()
    .trim()
    .min(2, { message: 'Last name must be at least 2 characters long' })
    .max(50, { message: 'Last name must be at most 50 characters long' }),

  email: z.string().trim().email({ message: 'Invalid email address' }),

  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(100, { message: 'Password must be at most 100 characters long' }),

  role: z.enum(RoleName, { message: 'Invalid role. Must be ADMIN, HR, or CONSULTATION' }),
});

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),

  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

export const notifyEmployeeChangeSchema = z.object({
  userEmail: z.string().trim().email({ message: 'Invalid email address' }),
  action: z.string().min(1, { message: 'Action is required' }),
  employeeName: z.string().min(1, { message: 'Employee name is required' }),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8, { message: 'Current password must be at least 8 characters long' }),
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters long' }).max(100, { message: 'New password must be at most 100 characters long' }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
  newPassword: z.string().min(8, { message: 'New password must be at least 8 characters long' }).max(100, { message: 'New password must be at most 100 characters long' }),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
});

export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type LoginUserSchema = z.infer<typeof loginSchema>;
export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>;
export type LogoutSchema = z.infer<typeof logoutSchema>;
export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>;
