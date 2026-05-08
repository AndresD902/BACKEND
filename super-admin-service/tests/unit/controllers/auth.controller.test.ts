import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../../src/services/auth.service', () => ({
  authService: {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    recoverPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

import { authService } from '../../../src/services/auth.service';
import { AuthController } from '../../../src/controller/auth.controller';

const mockAuthService = vi.mocked(authService);

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, _json: json } as unknown as Response & { _json: typeof json };
}

function makeReq(body: object = {}, extra: Partial<Request> = {}): Request {
  return { body, ip: '127.0.0.1', headers: {}, ...extra } as unknown as Request;
}

describe('AuthController', () => {
  let ctrl: AuthController;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ctrl = new AuthController();
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('llama a authService.register y responde 201', async () => {
      const creado = { id: 1, nombre: 'Admin', email: 'a@b.com' };
      mockAuthService.register.mockResolvedValue(creado);
      const req = makeReq({ nombre: 'Admin', email: 'a@b.com', password: 'pass' });
      const res = makeRes();

      ctrl.register(req, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res._json).toHaveBeenCalledWith({ success: true, data: creado });
    });

    it('pasa el error a next si el servicio lanza', async () => {
      const err = new Error('conflict');
      mockAuthService.register.mockRejectedValue(err);
      const req = makeReq({ nombre: 'Admin', email: 'a@b.com', password: 'pass' });
      const res = makeRes();

      ctrl.register(req, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('login', () => {
    it('llama a authService.login con ip y user-agent y responde 200', async () => {
      const loginData = { access_token: 'jwt', refresh_token: 'rt', super_admin: { id: 1 } };
      mockAuthService.login.mockResolvedValue(loginData as never);
      const req = makeReq({ email: 'a@b.com', password: 'pass' }, {
        ip: '10.0.0.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      });
      const res = makeRes();

      ctrl.login(req, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'a@b.com', ipOrigen: '10.0.0.1', userAgent: 'Mozilla/5.0' }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json).toHaveBeenCalledWith({ success: true, data: loginData });
    });
  });

  describe('refresh', () => {
    it('llama a authService.refresh y responde 200', async () => {
      const refreshData = { access_token: 'new.jwt' };
      mockAuthService.refresh.mockResolvedValue(refreshData);
      const req = makeReq({ refresh_token: 'old-rt' });
      const res = makeRes();

      ctrl.refresh(req, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockAuthService.refresh).toHaveBeenCalledWith('old-rt', '127.0.0.1', undefined);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('logout', () => {
    it('llama a authService.logout y responde 200 con mensaje', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const req = makeReq({ refresh_token: 'rt-to-revoke' });
      const res = makeRes();

      ctrl.logout(req, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockAuthService.logout).toHaveBeenCalledWith('rt-to-revoke', '127.0.0.1', undefined);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: expect.any(String) }),
      );
    });
  });

  describe('recoverPassword', () => {
    it('llama a authService.recoverPassword y responde 200', async () => {
      mockAuthService.recoverPassword.mockResolvedValue(undefined);
      const req = makeReq({ email: 'admin@test.com' });
      const res = makeRes();

      ctrl.recoverPassword(req, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockAuthService.recoverPassword).toHaveBeenCalledWith('admin@test.com');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('resetPassword', () => {
    it('llama a authService.resetPassword y responde 200', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);
      const req = makeReq({ token: 'reset-tok', password: 'nuevaPass123' });
      const res = makeRes();

      ctrl.resetPassword(req, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith('reset-tok', 'nuevaPass123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });
});
