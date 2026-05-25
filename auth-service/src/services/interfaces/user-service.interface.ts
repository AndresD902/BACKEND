import { RoleName } from '../../entities/role.entity';

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RoleName;
  isActive: boolean;
  companyId: number | null;
  employeeId: number | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserStatusResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RoleName;
  isActive: boolean;
  companyId: number | null;
  employeeId: number | null;
  updatedAt: Date;
}

export interface IUserService {
  findAll(companyId?: number): Promise<UserSummary[]>;
  findById(id: string): Promise<UserSummary>;
  deactivate(id: string): Promise<UserStatusResult>;
  activate(id: string): Promise<UserStatusResult>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
