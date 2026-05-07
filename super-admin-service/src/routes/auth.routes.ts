import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { verifyRegisterSecret, verifySuperAdminToken } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { registerSuperAdminSchema } from '../dtos/register-super-admin.dto';
import { loginSchema } from '../dtos/login.dto';
import { z } from 'zod';

const router = Router();

const refreshSchema       = z.object({ refresh_token: z.string().min(1) });
const recoverSchema       = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).max(72),
});

// Bootstrap — protected by shared secret header (X-Register-Secret)
router.post('/register',
  verifyRegisterSecret,
  validateBody(registerSuperAdminSchema),
  authController.register,
);

router.post('/login',         validateBody(loginSchema),           authController.login);
router.post('/refresh',       validateBody(refreshSchema),         authController.refresh);
router.post('/logout',        verifySuperAdminToken, validateBody(refreshSchema), authController.logout);
router.post('/recover-password', validateBody(recoverSchema),      authController.recoverPassword);
router.post('/reset-password',   validateBody(resetPasswordSchema), authController.resetPassword);

export default router;
