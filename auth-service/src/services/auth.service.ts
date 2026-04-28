import { UserRepository, userRepository } from '../repositories/user.repository';
import { RefreshTokenRepository, refreshTokenRepository } from '../repositories/refreshToken.repository';
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

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  public async register(createUserDto: CreateUserDto) {
    const normalizedEmail = createUserDto.email.toLowerCase().trim();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
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

  public async login(loginDto: LoginDto, ipOrigin?: string, userAgent?: string) {
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

  public async refresh(incomingRefreshToken: string) {
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
}

export const authService = new AuthService(userRepository, refreshTokenRepository);
