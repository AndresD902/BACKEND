import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/async-handler.util';
import { authService as defaultAuthService } from '../services/auth.service';
import { IAuthService } from '../services/interfaces/auth-service.interface';
import { registrarAccion } from '../clients/historyServiceClient';

// La validación del x-internal-key se aplica en internal.routes.ts como middleware del router
export class InternalController {
  constructor(private readonly authService: IAuthService = defaultAuthService) {}

  public createUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const user = await this.authService.registerSystemUser(req.body);

    registrarAccion({
      usuario_email: 'internal-service',
      rol: 'SYSTEM',
      accion: user.role === 'CONSULTATION' ? 'creacion_consultante' : 'creacion_usuario_sistema',
      entidad: 'usuario',
      detalle: JSON.stringify({
        targetUserId: user.id,
        targetEmail: user.email,
        role: user.role,
        companyId: user.companyId,
        employeeId: user.employeeId,
      }),
      ip_origen: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.status(201).json({
      success: true,
      message: 'Internal user created successfully',
      data: user,
    });
  });

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
