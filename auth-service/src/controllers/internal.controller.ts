import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/async-handler.util';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';
import { authService as defaultAuthService } from '../services/auth.service';
import { IAuthService } from '../services/interfaces/auth-service.interface';

export class InternalController {
  constructor(private readonly authService: IAuthService = defaultAuthService) {}

  public notifyEmployeeChange = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const headerKey = req.headers['x-internal-key'];

    if (typeof headerKey !== 'string' || headerKey !== env.internalApiKey) {
      throw new UnauthorizedError('Invalid internal API key');
    }

    const { userEmail, action, employeeName } = req.body;

    await this.authService.notifyEmployeeChange(userEmail, action, employeeName);

    res.status(200).json({
      success: true,
      message: 'Employee change notification processed',
    });
  });
}

export const internalController = new InternalController();
