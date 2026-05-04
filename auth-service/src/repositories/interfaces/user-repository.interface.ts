import { RoleName } from '../../entities/role.entity';
import { User } from '../../entities/user.entity';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: RoleName;
  isActive?: boolean;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  findAll(): Promise<User[]>;
  updateLastLogin(id: string): Promise<void>;
  updateStatus(id: string, isActive: boolean): Promise<User | null>;
  updatePasswordHash(id: string, newHash: string): Promise<void>;
  updateNotificationPrefs(id: string, notifLogin: boolean, notifCambios: boolean): Promise<void>;
}
