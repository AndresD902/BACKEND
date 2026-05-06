import crypto from 'crypto';
import { userRepository } from '../repositories/user.repository';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { passwordResetTokenRepository as defaultPrtRepository } from '../repositories/password-reset-token.repository';
import { IUserRepository } from '../repositories/interfaces/user-repository.interface';
import { IRefreshTokenRepository } from '../repositories/interfaces/refresh-token-repository.interface';
import { IPasswordResetTokenRepository } from '../repositories/interfaces/password-reset-token-repository.interface';
import { IAuthService, LoginResult, UserProfile, NotificationPrefs } from './interfaces/auth-service.interface';
import { IEmailService } from './interfaces/email-service.interface';
import { emailService as defaultEmailService } from './email/smtp-email.service';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateJwtToken } from '../utils/jwt.util';
import { generateRefreshToken, hashToken } from '../utils/token.util';
import { CreateUserDto } from '../dtos/create-user.dto';
import { LoginDto } from '../dtos/login.dto';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { ForbiddenError } from '../shared/errors/forbidden.error';
import { ConflictError } from '../shared/errors/conflict.error';
import { NotFoundError } from '../shared/errors/not-found.error';
import { RoleName } from '../entities/role.entity';
import { env } from '../config/env';
import { isRegisteredEmployee } from '../clients/employeeServiceClient';

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly passwordResetTokenRepository: IPasswordResetTokenRepository = defaultPrtRepository,
    private readonly emailService: IEmailService = defaultEmailService,
  ) {}

  public async register(createUserDto: CreateUserDto): Promise<UserProfile> {
    const normalizedEmail = createUserDto.email.toLowerCase().trim();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    if (createUserDto.role === RoleName.CONSULTATION) {
      const exists = await isRegisteredEmployee(normalizedEmail);
      if (!exists) {
        throw new ForbiddenError(
          'Users with CONSULTATION role must be registered employees. Contact HR to register your employee record first.',
        );
      }
    }

    const hashedPassword = await hashPassword(createUserDto.password);
    const createdUser = await this.userRepository.create({
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      email: normalizedEmail,
      passwordHash: hashedPassword,
      role: createUserDto.role,
      isActive: true,
    });

    return {
      id: createdUser.id,
      firstName: createdUser.firstName,
      lastName: createdUser.lastName,
      email: createdUser.email,
      role: createdUser.role,
      isActive: createdUser.isActive,
      createdAt: createdUser.createdAt,
      updatedAt: createdUser.updatedAt,
    };
  }

  public async login(loginDto: LoginDto, ipOrigin?: string, userAgent?: string): Promise<LoginResult> {
    const normalizedEmail = loginDto.email.toLowerCase().trim();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (!user.isActive) {
      throw new ForbiddenError('User account is inactive');
    }

    const isPasswordValid = await comparePassword(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = generateJwtToken({
      sub: user.id,
      email: user.email,
      role: user.role as RoleName,
    });

    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepository.create({ userId: user.id, tokenHash, expiresAt, ipOrigin, userAgent });
    await this.userRepository.updateLastLogin(user.id);

    // Fire-and-forget login alert — never blocks the login response
    if (user.notifLogin) {
      this.emailService.sendLoginAlertEmail(user.email, ipOrigin, userAgent).catch(() => {});
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role as RoleName,
        isActive: user.isActive,
      },
    };
  }

  public async refresh(incomingRefreshToken: string): Promise<{ accessToken: string }> {
    const tokenHash = hashToken(incomingRefreshToken);
    const record = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!record || record.revoked || new Date(record.expiresAt) < new Date()) {
      throw new UnauthorizedError('Invalid or revoked refresh token');
    }

    const user = await this.userRepository.findById(record.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    const accessToken = generateJwtToken({
      sub: user.id,
      email: user.email,
      role: user.role as RoleName,
    });

    return { accessToken };
  }

  public async logout(incomingRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(incomingRefreshToken);
    await this.refreshTokenRepository.revokeByHash(tokenHash);
  }

  public async logoutAll(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    await this.refreshTokenRepository.revokeAllByUserId(userId);
  }

  public async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email.toLowerCase().trim());
    // Always respond success to prevent email enumeration
    if (!user || !user.isActive) return;

    await this.passwordResetTokenRepository.deleteExpiredByUserId(user.id);

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + env.resetTokenExpiresMinutes * 60 * 1000);

    await this.passwordResetTokenRepository.create(user.id, tokenHash, expiresAt);

    const resetLink = `${env.frontendUrl}/reset-password?token=${rawToken}`;
    await this.emailService.sendPasswordResetEmail(user.email, resetLink);
  }

  public async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await this.passwordResetTokenRepository.findByHash(tokenHash);

    if (!record || record.used || new Date(record.expiresAt) < new Date()) {
      throw new UnauthorizedError('Token de restablecimiento inválido o expirado');
    }

    const newHash = await hashPassword(newPassword);
    await this.userRepository.updatePasswordHash(record.userId, newHash);
    await this.passwordResetTokenRepository.markUsed(record.id);
    await this.refreshTokenRepository.revokeAllByUserId(record.userId);
  }

  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Usuario no encontrado o inactivo');
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('La contraseña actual es incorrecta');
    }

    const newHash = await hashPassword(newPassword);
    await this.userRepository.updatePasswordHash(userId, newHash);
    await this.refreshTokenRepository.revokeAllByUserId(userId);
  }

  public async getPreferences(userId: string): Promise<NotificationPrefs> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return { notifLogin: user.notifLogin, notifCambios: user.notifCambios };
  }

  public async updatePreferences(userId: string, prefs: NotificationPrefs): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    await this.userRepository.updateNotificationPrefs(userId, prefs.notifLogin, prefs.notifCambios);
  }

  public async notifyEmployeeChange(userEmail: string, action: string, employeeName: string): Promise<void> {
    const user = await this.userRepository.findByEmail(userEmail);
    if (!user || !user.notifCambios) return;
    this.emailService.sendEmployeeChangeEmail(user.email, action, employeeName).catch(() => {});
  }
}

export const authService = new AuthService(userRepository, refreshTokenRepository);
