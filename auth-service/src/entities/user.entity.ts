import { RoleName } from './role.entity';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: RoleName;
  companyId: number | null;
  employeeId: number | null;
  isActive: boolean;
  emailVerified: boolean;
  mustChangePassword: boolean;
  lastLogin: Date | null;
  notifLogin: boolean;
  notifCambios: boolean;
  createdAt: Date;
  updatedAt: Date;
}
