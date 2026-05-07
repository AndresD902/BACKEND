import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/async-handler.util';

export class AuthController {
  // POST /api/super-admin/register
  public register = asyncHandler(async (req, res: Response) => {
    const data = await authService.register(req.body);
    res.status(201).json({ success: true, data });
  });

  // POST /api/super-admin/login
  public login = asyncHandler(async (req, res: Response) => {
    const data = await authService.login({
      ...req.body,
      ipOrigen:  req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(200).json({ success: true, data });
  });

  // POST /api/super-admin/refresh
  public refresh = asyncHandler(async (req, res: Response) => {
    const { refresh_token } = req.body as { refresh_token: string };
    const data = await authService.refresh(refresh_token, req.ip, req.headers['user-agent']);
    res.status(200).json({ success: true, data });
  });

  // POST /api/super-admin/logout
  public logout = asyncHandler(async (req, res: Response) => {
    const { refresh_token } = req.body as { refresh_token: string };
    await authService.logout(refresh_token, req.ip, req.headers['user-agent']);
    res.status(200).json({ success: true, message: 'Sesión cerrada correctamente' });
  });

  // POST /api/super-admin/recover-password
  public recoverPassword = asyncHandler(async (req, res: Response) => {
    const { email } = req.body as { email: string };
    await authService.recoverPassword(email);
    res.status(200).json({
      success: true,
      message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
    });
  });

  // POST /api/super-admin/reset-password
  public resetPassword = asyncHandler(async (req, res: Response) => {
    const { token, password } = req.body as { token: string; password: string };
    await authService.resetPassword(token, password);
    res.status(200).json({ success: true, message: 'Contraseña restablecida correctamente' });
  });
}

export const authController = new AuthController();
