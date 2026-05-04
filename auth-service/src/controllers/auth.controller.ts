import { NextFunction, Request, Response } from 'express';
import { authService as defaultAuthService } from '../services/auth.service';
import { IAuthService } from '../services/interfaces/auth-service.interface';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { asyncHandler } from '../utils/async-handler.util';
import { registrarAccion } from '../clients/historyServiceClient';

export class AuthController {
  constructor(private readonly authService: IAuthService = defaultAuthService) {}

  public register = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.authService.register(req.body);
    registrarAccion({
      usuario_email: user.email,
      rol:           user.role,
      accion:        'registro',
      resultado:     'exitoso',
      ip_origen:     req.ip,
      user_agent:    req.headers['user-agent'],
    });
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  });

  public login = asyncHandler(async (req: Request, res: Response) => {
    const ipOrigin  = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(req.body, ipOrigin, userAgent);
    registrarAccion({
      usuario_email: result.user.email,
      rol:           result.user.role,
      accion:        'login',
      resultado:     'exitoso',
      ip_origen:     ipOrigin,
      user_agent:    userAgent,
    });
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  });

  public refresh = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await this.authService.refresh(refreshToken);
    registrarAccion({
      accion:     'token_renovado',
      resultado:  'exitoso',
      ip_origen:  req.ip,
      user_agent: req.headers['user-agent'],
    });
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    });
  });

  public logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await this.authService.logout(refreshToken);
    registrarAccion({
      accion:     'logout',
      resultado:  'exitoso',
      ip_origen:  req.ip,
      user_agent: req.headers['user-agent'],
    });
    res.status(200).json({
      success: true,
      message: 'Session closed successfully',
    });
  });

  public logoutAll = asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next(new UnauthorizedError('User not authenticated'));
      }
      await this.authService.logoutAll(req.user.sub);
      registrarAccion({
        usuario_email: req.user.email,
        rol:           req.user.role,
        accion:        'logout_all',
        resultado:     'exitoso',
        ip_origen:     req.ip,
        user_agent:    req.headers['user-agent'],
      });
      res.status(200).json({
        success: true,
        message: 'All sessions closed successfully',
      });
    },
  );

  public forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await this.authService.forgotPassword(req.body.email);
    // Always 200 — prevents email enumeration
    res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    });
  });

  public resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    await this.authService.resetPassword(token, newPassword);
    res.status(200).json({
      success: true,
      message: 'Password updated successfully. Please log in again.',
    });
  });

  public changePassword = asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next(new UnauthorizedError('User not authenticated'));
      }
      const { currentPassword, newPassword } = req.body;
      await this.authService.changePassword(req.user.sub, currentPassword, newPassword);
      registrarAccion({
        usuario_email: req.user.email,
        rol:           req.user.role,
        accion:        'cambio_contrasena',
        resultado:     'exitoso',
        ip_origen:     req.ip,
        user_agent:    req.headers['user-agent'],
      });
      res.status(200).json({
        success: true,
        message: 'Password changed successfully.',
      });
    },
  );

  public getPreferences = asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) return next(new UnauthorizedError('User not authenticated'));
      const prefs = await this.authService.getPreferences(req.user.sub);
      res.status(200).json({ success: true, data: prefs });
    },
  );

  public updatePreferences = asyncHandler(
    async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) return next(new UnauthorizedError('User not authenticated'));
      await this.authService.updatePreferences(req.user.sub, req.body);
      res.status(200).json({ success: true, message: 'Preferences updated.' });
    },
  );

  public notifyEmployeeChange = asyncHandler(async (req: Request, res: Response) => {
    const { userEmail, action, employeeName } = req.body;
    await this.authService.notifyEmployeeChange(userEmail, action, employeeName);
    res.status(200).json({ success: true });
  });
}

export const authController = new AuthController();
