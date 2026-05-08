import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
}));

vi.mock('../../../src/repositories/superAdmin.repository', () => ({
  superAdminRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    updateUltimoLogin: vi.fn(),
    setResetToken: vi.fn(),
    findByResetToken: vi.fn(),
    updatePassword: vi.fn(),
    clearResetToken: vi.fn(),
  },
}));

vi.mock('../../../src/repositories/refreshToken.repository', () => ({
  refreshTokenRepository: {
    create: vi.fn(),
    findByHash: vi.fn(),
    revocarPorHash: vi.fn(),
    revocarTodosPorSuperAdmin: vi.fn(),
  },
}));

vi.mock('../../../src/services/email.service', () => ({
  emailService: { enviarRecuperacionContrasena: vi.fn() },
}));

vi.mock('../../../src/utils/jwt.util', () => ({
  signJwt: vi.fn().mockReturnValue('mocked.jwt.token'),
}));

vi.mock('../../../src/utils/crypto.util', () => ({
  randomToken: vi.fn().mockReturnValue('raw-refresh-token'),
  sha256: vi.fn().mockReturnValue('hashed-refresh-token'),
  randomTempPassword: vi.fn().mockReturnValue('tempPass123'),
}));

vi.mock('../../../src/clients/historyClient', () => ({
  registrarAccion: vi.fn(),
}));

import bcrypt from 'bcrypt';
import { superAdminRepository } from '../../../src/repositories/superAdmin.repository';
import { refreshTokenRepository } from '../../../src/repositories/refreshToken.repository';
import { emailService } from '../../../src/services/email.service';
import { authService } from '../../../src/services/auth.service';
import { ConflictError } from '../../../src/shared/errors/conflict.error';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { AppError } from '../../../src/shared/errors/app-error';

const mockBcrypt = vi.mocked(bcrypt);
const mockSuperAdminRepo = vi.mocked(superAdminRepository);
const mockRefreshTokenRepo = vi.mocked(refreshTokenRepository);
const mockEmailService = vi.mocked(emailService);

const FAKE_ADMIN = {
  id: 1,
  nombre: 'Super Admin Test',
  email: 'superadmin@test.com',
  password_hash: '$2b$12$hashedpassword',
  activo: true,
};

const FAKE_REFRESH_TOKEN_RECORD = {
  id: 1,
  super_admin_id: 1,
  token_hash: 'hashed-refresh-token',
  expires_at: new Date(Date.now() + 86_400_000),
  revocado: false,
  ip_origen: null,
  user_agent: null,
};

describe('authService.register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('crea un super admin y retorna id, nombre y email', async () => {
    mockSuperAdminRepo.findByEmail.mockResolvedValue(null);
    (mockBcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$12$newhash' as never);
    mockSuperAdminRepo.create.mockResolvedValue(FAKE_ADMIN);

    const result = await authService.register({
      nombre: 'Super Admin Test',
      email: 'superadmin@test.com',
      password: 'segura123',
    });

    expect(result).toEqual({ id: 1, nombre: 'Super Admin Test', email: 'superadmin@test.com' });
    expect(mockSuperAdminRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'superadmin@test.com' }),
    );
  });

  it('lanza ConflictError si ya existe un admin con ese correo', async () => {
    mockSuperAdminRepo.findByEmail.mockResolvedValue(FAKE_ADMIN);

    await expect(
      authService.register({ nombre: 'Admin', email: 'superadmin@test.com', password: 'pass' }),
    ).rejects.toThrow(ConflictError);

    expect(mockSuperAdminRepo.create).not.toHaveBeenCalled();
  });
});

describe('authService.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna access_token, refresh_token y datos del admin', async () => {
    mockSuperAdminRepo.findByEmail.mockResolvedValue(FAKE_ADMIN);
    (mockBcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true as never);
    mockRefreshTokenRepo.create.mockResolvedValue(undefined as never);
    mockSuperAdminRepo.updateUltimoLogin.mockResolvedValue(undefined as never);

    const result = await authService.login({
      email: 'superadmin@test.com',
      password: 'correctPass',
      ipOrigen: '127.0.0.1',
    });

    expect(result).toHaveProperty('access_token', 'mocked.jwt.token');
    expect(result).toHaveProperty('refresh_token', 'raw-refresh-token');
    expect(result.super_admin).toEqual({ id: 1, email: FAKE_ADMIN.email, nombre: FAKE_ADMIN.nombre });
    expect(mockRefreshTokenRepo.create).toHaveBeenCalledOnce();
  });

  it('lanza AppError 401 si el usuario no existe', async () => {
    mockSuperAdminRepo.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'noexiste@test.com', password: 'pass' }),
    ).rejects.toThrow(AppError);

    const result = authService.login({ email: 'noexiste@test.com', password: 'pass' });
    await expect(result).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('lanza AppError 401 si el admin está inactivo', async () => {
    mockSuperAdminRepo.findByEmail.mockResolvedValue({ ...FAKE_ADMIN, activo: false });

    await expect(
      authService.login({ email: 'superadmin@test.com', password: 'pass' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lanza AppError 401 si la contraseña es incorrecta', async () => {
    mockSuperAdminRepo.findByEmail.mockResolvedValue(FAKE_ADMIN);
    (mockBcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false as never);

    await expect(
      authService.login({ email: 'superadmin@test.com', password: 'wrongPass' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'INVALID_CREDENTIALS' });

    expect(mockRefreshTokenRepo.create).not.toHaveBeenCalled();
  });
});

describe('authService.refresh', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna un nuevo access_token cuando el refresh token es válido', async () => {
    mockRefreshTokenRepo.findByHash.mockResolvedValue(FAKE_REFRESH_TOKEN_RECORD);
    mockSuperAdminRepo.findById.mockResolvedValue(FAKE_ADMIN);

    const result = await authService.refresh('raw-refresh-token');

    expect(result).toEqual({ access_token: 'mocked.jwt.token' });
  });

  it('lanza AppError 401 si el token no existe', async () => {
    mockRefreshTokenRepo.findByHash.mockResolvedValue(null);

    await expect(authService.refresh('token-invalido')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('lanza AppError 401 si el token está revocado', async () => {
    mockRefreshTokenRepo.findByHash.mockResolvedValue({
      ...FAKE_REFRESH_TOKEN_RECORD,
      revocado: true,
    });

    await expect(authService.refresh('raw-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('lanza AppError 401 si el token está expirado', async () => {
    mockRefreshTokenRepo.findByHash.mockResolvedValue({
      ...FAKE_REFRESH_TOKEN_RECORD,
      expires_at: new Date(Date.now() - 1000), // ya expiró
    });

    await expect(authService.refresh('raw-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INVALID_REFRESH_TOKEN',
    });
  });

  it('lanza AppError 401 si el admin asociado está inactivo', async () => {
    mockRefreshTokenRepo.findByHash.mockResolvedValue(FAKE_REFRESH_TOKEN_RECORD);
    mockSuperAdminRepo.findById.mockResolvedValue({ ...FAKE_ADMIN, activo: false });

    await expect(authService.refresh('raw-refresh-token')).rejects.toMatchObject({
      statusCode: 401,
      code: 'INACTIVE_SUPER_ADMIN',
    });
  });
});

describe('authService.logout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('revoca el refresh token', async () => {
    mockRefreshTokenRepo.findByHash.mockResolvedValue(FAKE_REFRESH_TOKEN_RECORD);
    mockRefreshTokenRepo.revocarPorHash.mockResolvedValue(undefined as never);
    mockSuperAdminRepo.findById.mockResolvedValue(FAKE_ADMIN);

    await authService.logout('raw-refresh-token', '127.0.0.1');

    expect(mockRefreshTokenRepo.revocarPorHash).toHaveBeenCalledOnce();
  });

  it('no lanza si el token no existe en BD', async () => {
    mockRefreshTokenRepo.findByHash.mockResolvedValue(null);
    mockRefreshTokenRepo.revocarPorHash.mockResolvedValue(undefined as never);

    await expect(authService.logout('token-desconocido')).resolves.toBeUndefined();
  });
});

describe('authService.recoverPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna silenciosamente si el correo no existe (previene enumeración de usuarios)', async () => {
    mockSuperAdminRepo.findByEmail.mockResolvedValue(null);

    await expect(authService.recoverPassword('noexiste@test.com')).resolves.toBeUndefined();

    expect(mockEmailService.enviarRecuperacionContrasena).not.toHaveBeenCalled();
  });

  it('guarda el token de reset y envía el correo cuando el admin existe', async () => {
    mockSuperAdminRepo.findByEmail.mockResolvedValue(FAKE_ADMIN);
    mockSuperAdminRepo.setResetToken.mockResolvedValue(undefined as never);
    mockEmailService.enviarRecuperacionContrasena.mockResolvedValue(undefined);

    await authService.recoverPassword('superadmin@test.com');

    expect(mockSuperAdminRepo.setResetToken).toHaveBeenCalledWith(
      FAKE_ADMIN.id,
      'tempPass123',
      expect.any(Date),
    );
    expect(mockEmailService.enviarRecuperacionContrasena).toHaveBeenCalledWith(
      expect.objectContaining({ to: FAKE_ADMIN.email }),
    );
  });
});

describe('authService.resetPassword', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lanza NotFoundError si el token de reset no existe', async () => {
    mockSuperAdminRepo.findByResetToken.mockResolvedValue(null);

    await expect(authService.resetPassword('token-invalido', 'newPass123')).rejects.toThrow(
      NotFoundError,
    );
  });

  it('actualiza la contraseña, limpia el token y revoca todos los refresh tokens', async () => {
    mockSuperAdminRepo.findByResetToken.mockResolvedValue(FAKE_ADMIN);
    (mockBcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$12$newhash' as never);
    mockSuperAdminRepo.updatePassword.mockResolvedValue(undefined as never);
    mockSuperAdminRepo.clearResetToken.mockResolvedValue(undefined as never);
    mockRefreshTokenRepo.revocarTodosPorSuperAdmin.mockResolvedValue(undefined as never);

    await authService.resetPassword('token-valido', 'nuevaContrasena!');

    expect(mockSuperAdminRepo.updatePassword).toHaveBeenCalledWith(FAKE_ADMIN.id, '$2b$12$newhash');
    expect(mockSuperAdminRepo.clearResetToken).toHaveBeenCalledWith(FAKE_ADMIN.id);
    expect(mockRefreshTokenRepo.revocarTodosPorSuperAdmin).toHaveBeenCalledWith(FAKE_ADMIN.id);
  });
});
