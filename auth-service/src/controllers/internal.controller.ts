import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/async-handler.util';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';

export class InternalController {
  public notifyEmployeeChange = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const headerKey = req.headers['x-internal-key'];

    if (typeof headerKey !== 'string' || headerKey !== env.internalApiKey) {
      throw new UnauthorizedError('Invalid internal API key');
    }

    const { userEmail, action, employeeName } = req.body;

    console.info('[Internal] notifyEmployeeChange received', {
      userEmail,
      action,
      employeeName,
    });

    res.status(200).json({
      success: true,
      message: 'Employee change notification received',
      data: { userEmail, action, employeeName },
    });
  });
}

export const internalController = new InternalController();
