import { Response } from 'express';
import { userService as defaultUserService } from '../services/user.service';
import { IUserService } from '../services/interfaces/user-service.interface';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler.util';

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

}

export const userController = new UserController();
