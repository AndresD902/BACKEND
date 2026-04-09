import { z } from "zod";
import { RoleName } from "../entities/role.entity";


export const createUserSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, { message: "First name must be at least 2 characters long" })
    .max(50, { message: "First name must be at most 50 characters long" }),

    lastName: z
    .string()
    .trim()
    .min(2, { message: "Last name must be at least 2 characters long" })
    .max(50, { message: "Last name must be at most 50 characters long" }),

    email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" }),

    password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(100, { message: "Password must be at most 100 characters long" }),

    role: z.enum(RoleName, {
      message: "Invalid role",
    }),
});

export const loginSchema = z.object({
    email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" }),

    password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })

})

export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type LoginUserSchema = z.infer<typeof loginSchema>;