import { RoleName } from '../../entities/role.entity';
import { CreateUserDto } from '../../dtos/create-user.dto';
import { LoginDto } from '../../dtos/login.dto';

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RoleName;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: Omit<UserProfile, 'createdAt' | 'updatedAt'>;
}

export interface IAuthService {
  register(dto: CreateUserDto): Promise<UserProfile>;
  login(dto: LoginDto, ipOrigin?: string, userAgent?: string): Promise<LoginResult>;
  refresh(incomingRefreshToken: string): Promise<{ accessToken: string }>;
  logout(incomingRefreshToken: string): Promise<void>;
  logoutAll(userId: string): Promise<void>;
}
