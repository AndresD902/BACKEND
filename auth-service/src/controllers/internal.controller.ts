import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/async-handler.util';
import { authService as defaultAuthService } from '../services/auth.service';
import { IAuthService } from '../services/interfaces/auth-service.interface';

// La validación del x-internal-key se aplica en internal.routes.ts como middleware del router
export class InternalController {
  constructor(private readonly authService: IAuthService = defaultAuthService) {}

  public notifyEmployeeChange = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { userEmail, action, employeeName } = req.body;

    await this.authService.notifyEmployeeChange(userEmail, action, employeeName);

    res.status(200).json({
      success: true,
      message: 'Employee change notification processed',
    });
  });

  public notifyCorrectionRequest = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { empleadoNombre, descripcion, solicitante } = req.body;

    await this.authService.notifyCorrectionRequest(empleadoNombre, descripcion, solicitante);

    res.status(200).json({
      success: true,
      message: 'Correction request notification sent',
    });
  });
}

export const internalController = new InternalController();
