import { Response } from 'express';
import { userService as defaultUserService } from '../services/user.service';
import { IUserService } from '../services/interfaces/user-service.interface';
import { authService as defaultAuthService } from '../services/auth.service';
import { IAuthService } from '../services/interfaces/auth-service.interface';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler.util';
import { ChangePasswordSchema, CreateManagedUserSchema } from '../schemas/auth.schema';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { ForbiddenError } from '../shared/errors/forbidden.error';
import { RoleName } from '../entities/role.entity';
import { registrarAccion } from '../clients/historyServiceClient';

export class UserController {
  constructor(
    private readonly userService: IUserService = defaultUserService,
    private readonly authService: IAuthService = defaultAuthService,
  ) {}

  public create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    if (!req.user.companyId) {
      throw new ForbiddenError('Admin user must belong to a company');
    }

    const body = req.body as CreateManagedUserSchema;
    if (body.role && body.role !== RoleName.HR) {
      throw new ForbiddenError('Admins can only create HR users from this endpoint');
    }

    const user = await this.authService.registerSystemUser({
      ...body,
      role: RoleName.HR,
      companyId: req.user.companyId,
      emailVerified: true,
      mustChangePassword: true,
    });

    registrarAccion({
      usuario_email: req.user.email,
      rol: req.user.role,
      accion: 'creacion_hr',
      entidad: 'usuario',
      detalle: JSON.stringify({
        targetUserId: user.id,
        targetEmail: user.email,
        companyId: req.user.companyId,
      }),
      ip_origen: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'HR user created successfully',
      data: user,
    });
  });

  public findAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const users = await this.userService.findAll(req.user?.companyId);
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
    });
  });

  public findById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await this.userService.findById(String(req.params.id));
    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user,
    });
  });

  public deactivate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await this.userService.deactivate(String(req.params.id));
    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: user,
    });
  });

  public activate = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = await this.userService.activate(String(req.params.id));
    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      data: user,
    });
  });

  public getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }
    const user = await this.userService.findById(req.user.sub);
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user,
    });
  });

  public changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const body = req.body as ChangePasswordSchema;

    await this.userService.changePassword(req.user.sub, body.currentPassword, body.newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  });
}

export const userController = new UserController();
