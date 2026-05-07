import bcrypt from 'bcrypt';
import { superAdminRepository } from '../repositories/superAdmin.repository';
import { refreshTokenRepository } from '../repositories/refreshToken.repository';
import { emailService } from './email.service';
import { signJwt } from '../utils/jwt.util';
import { randomToken, sha256, randomTempPassword } from '../utils/crypto.util';
import { registrarAccion } from '../clients/historyClient';
import { AppError } from '../shared/errors/app-error';
import { ConflictError } from '../shared/errors/conflict.error';
import { NotFoundError } from '../shared/errors/not-found.error';
import { env } from '../config/env';

const SALT_ROUNDS = 12;

export const authService = {
  async register(data: {
    nombre:   string;
    email:    string;
    password: string;
  }) {
    const existente = await superAdminRepository.findByEmail(data.email);
    if (existente) throw new ConflictError('Ya existe un Super Admin con ese correo');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const admin = await superAdminRepository.create({
      nombre:        data.nombre,
      email:         data.email,
      password_hash: passwordHash,
    });

    return { id: admin.id, nombre: admin.nombre, email: admin.email };
  },

  async login(data: {
    email:     string;
    password:  string;
    ipOrigen?: string;
    userAgent?: string;
  }) {
    const admin = await superAdminRepository.findByEmail(data.email);

    if (!admin || !admin.activo) {
      registrarAccion({
        usuario_email: data.email,
        rol:           'super_admin',
        accion:        'login',
        resultado:     'fallido',
        ip_origen:     data.ipOrigen,
        user_agent:    data.userAgent,
      });
      throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(data.password, admin.password_hash);
    if (!valid) {
      registrarAccion({
        usuario_email: data.email,
        rol:           'super_admin',
        accion:        'login',
        resultado:     'fallido',
        ip_origen:     data.ipOrigen,
        user_agent:    data.userAgent,
      });
      throw new AppError('Credenciales inválidas', 401, 'INVALID_CREDENTIALS');
    }

    const accessToken   = signJwt({ id: admin.id, email: admin.email, rol: 'super_admin' });
    const refreshToken  = randomToken();
    const tokenHash     = sha256(refreshToken);
    const expiresAt     = new Date(Date.now() + env.refreshTokenExpiresDays * 86_400_000);

    await refreshTokenRepository.create({
      super_admin_id: admin.id,
      token_hash:     tokenHash,
      expires_at:     expiresAt,
      ip_origen:      data.ipOrigen,
      user_agent:     data.userAgent,
    });

    await superAdminRepository.updateUltimoLogin(admin.id);

    registrarAccion({
      usuario_email: admin.email,
      rol:           'super_admin',
      accion:        'login',
      resultado:     'exitoso',
      ip_origen:     data.ipOrigen,
      user_agent:    data.userAgent,
    });

    return {
      access_token:  accessToken,
      refresh_token: refreshToken,
      super_admin:   { id: admin.id, email: admin.email, nombre: admin.nombre },
    };
  },

  async refresh(rawToken: string, ipOrigen?: string, userAgent?: string) {
    const tokenHash = sha256(rawToken);
    const registro  = await refreshTokenRepository.findByHash(tokenHash);

    if (!registro || registro.revocado || new Date(registro.expires_at) < new Date()) {
      throw new AppError('Token inválido o revocado', 401, 'INVALID_REFRESH_TOKEN');
    }

    const admin = await superAdminRepository.findById(registro.super_admin_id);
    if (!admin || !admin.activo) {
      throw new AppError('Super Admin inactivo', 401, 'INACTIVE_SUPER_ADMIN');
    }

    const accessToken = signJwt({ id: admin.id, email: admin.email, rol: 'super_admin' });

    registrarAccion({
      usuario_email: admin.email,
      rol:           'super_admin',
      accion:        'token_renovado',
      resultado:     'exitoso',
      ip_origen:     ipOrigen,
      user_agent:    userAgent,
    });

    return { access_token: accessToken };
  },

  async logout(rawToken: string, ipOrigen?: string, userAgent?: string) {
    const tokenHash = sha256(rawToken);
    const registro  = await refreshTokenRepository.findByHash(tokenHash);
    await refreshTokenRepository.revocarPorHash(tokenHash);

    if (registro) {
      const admin = await superAdminRepository.findById(registro.super_admin_id);
      registrarAccion({
        usuario_email: admin?.email,
        rol:           'super_admin',
        accion:        'logout',
        resultado:     'exitoso',
        ip_origen:     ipOrigen,
        user_agent:    userAgent,
      });
    }
  },

  async recoverPassword(email: string) {
    const admin = await superAdminRepository.findByEmail(email);
    if (!admin) return; // silently return to avoid user enumeration

    const resetToken   = randomTempPassword(32);
    const expiresAt    = new Date(Date.now() + env.resetTokenExpiresMinutes * 60_000);

    await superAdminRepository.setResetToken(admin.id, resetToken, expiresAt);
    await emailService.enviarRecuperacionContrasena({
      to:         admin.email,
      nombre:     admin.nombre,
      resetToken,
    });
  },

  async resetPassword(token: string, newPassword: string) {
    const admin = await superAdminRepository.findByResetToken(token);
    if (!admin) throw new NotFoundError('Token de recuperación');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await superAdminRepository.updatePassword(admin.id, passwordHash);
    await superAdminRepository.clearResetToken(admin.id);
    await refreshTokenRepository.revocarTodosPorSuperAdmin(admin.id);
  },
};
