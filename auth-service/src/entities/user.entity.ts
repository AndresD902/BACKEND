import { RoleName } from './role.entity';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: RoleName;
  isActive: boolean;
  lastLogin: Date | null;
  notifLogin: boolean;
  notifCambios: boolean;
  createdAt: Date;
  updatedAt: Date;
}
