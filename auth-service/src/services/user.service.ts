import { userRepository } from '../repositories/user.repository';
import { IUserRepository } from '../repositories/interfaces/user-repository.interface';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { IRefreshTokenRepository } from '../repositories/interfaces/refresh-token-repository.interface';
import { IUserService, UserSummary, UserStatusResult } from './interfaces/user-service.interface';
import { NotFoundError } from '../shared/errors/not-found.error';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { hashPassword, comparePassword } from '../utils/password.util';

export class UserService implements IUserService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  public async findAll(): Promise<UserSummary[]> {
    const users = await this.userRepository.findAll();
    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  }

  public async findById(id: string): Promise<UserSummary> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public async deactivate(id: string): Promise<UserStatusResult> {
    const user = await this.userRepository.updateStatus(id, false);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt,
    };
  }

  public async activate(id: string): Promise<UserStatusResult> {
    const user = await this.userRepository.updateStatus(id, true);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      updatedAt: user.updatedAt,
    };
  }

  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await this.userRepository.updatePassword(userId, newPasswordHash);

    // Revocar todas las sesiones activas — igual que reset-password, por seguridad
    await this.refreshTokenRepository.revokeAllByUserId(userId);
  }
}

export const userService = new UserService(userRepository, refreshTokenRepository);
