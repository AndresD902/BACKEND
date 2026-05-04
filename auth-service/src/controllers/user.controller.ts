import { Response } from 'express';
import { userService as defaultUserService } from '../services/user.service';
import { IUserService } from '../services/interfaces/user-service.interface';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler.util';
import { ChangePasswordSchema } from '../schemas/auth.schema';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';

export class UserController {
  constructor(private readonly userService: IUserService = defaultUserService) {}

  public findAll = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const users = await this.userService.findAll();
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
