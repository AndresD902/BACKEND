import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validate-request.middleware';
import { authenticate } from '../middlewares/auth.middleware';
import {
  createUserSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/auth.schema';

const authRoutes = Router();

authRoutes.post('/register',        validateRequest(createUserSchema),      authController.register);
authRoutes.post('/login',           validateRequest(loginSchema),           authController.login);
authRoutes.post('/refresh',         validateRequest(refreshTokenSchema),    authController.refresh);
authRoutes.post('/logout',          validateRequest(logoutSchema),          authController.logout);
authRoutes.post('/logout-all',      authenticate,                           authController.logoutAll);
authRoutes.post('/forgot-password', validateRequest(forgotPasswordSchema),  authController.forgotPassword);
authRoutes.post('/reset-password',  validateRequest(resetPasswordSchema),   authController.resetPassword);
authRoutes.get('/verify-email',                                             authController.verifyEmail);

export default authRoutes;
