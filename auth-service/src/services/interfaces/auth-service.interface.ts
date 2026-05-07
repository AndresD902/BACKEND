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
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: Omit<UserProfile, 'createdAt' | 'updatedAt'>;
}

export interface NotificationPrefs {
  notifLogin: boolean;
  notifCambios: boolean;
}

export interface IAuthService {
  register(dto: CreateUserDto): Promise<UserProfile>;
  login(dto: LoginDto, ipOrigin?: string, userAgent?: string): Promise<LoginResult>;
  refresh(incomingRefreshToken: string): Promise<{ accessToken: string; email: string; role: string }>;
  logout(incomingRefreshToken: string): Promise<{ email?: string; role?: string }>;
  logoutAll(userId: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  getPreferences(userId: string): Promise<NotificationPrefs>;
  updatePreferences(userId: string, prefs: NotificationPrefs): Promise<void>;
  notifyEmployeeChange(userEmail: string, action: string, employeeName: string): Promise<void>;
  notifyCorrectionRequest(empleadoNombre: string, descripcion: string, solicitante: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}
