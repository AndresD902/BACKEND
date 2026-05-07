import { Request, Response, NextFunction } from 'express';
import { VacationService } from '../services/vacation.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler.util';

export class VacationController {
  constructor(private readonly vacationService: VacationService) {}

  getByEmpleadoId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const empleadoId = parseInt(String(req.params.id), 10);
    const vacaciones = await this.vacationService.getByEmpleadoId(empleadoId);
    res.status(200).json(vacaciones);
  });

  getDiasDisponibles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const empleadoId = parseInt(String(req.params.id), 10);
    const dias = await this.vacationService.getDiasDisponibles(empleadoId);
    res.status(200).json(dias);
  });

  create = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const actor = req.user!;
    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const solicitud = await this.vacationService.create(req.body, actor, ip, userAgent);
    res.status(201).json(solicitud);
  });

  aprobar = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const actor = req.user!;
    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const actualizada = await this.vacationService.aprobar(id, actor, ip, userAgent);
    res.status(200).json(actualizada);
  });

  rechazar = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const actor = req.user!;
    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const actualizada = await this.vacationService.rechazar(id, req.body.motivo_rechazo, actor, ip, userAgent);
    res.status(200).json(actualizada);
  });

  cancelar = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const id = parseInt(String(req.params.id), 10);
    const actor = req.user!;
    const ip = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const actualizada = await this.vacationService.cancelar(id, actor, ip, userAgent);
    res.status(200).json(actualizada);
  });

  getFestivosByAnio = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const anio = parseInt(String(req.params.anio), 10);
    const festivos = await this.vacationService.getFestivosByAnio(anio);
    res.status(200).json(festivos);
  });

  createFestivo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const festivo = await this.vacationService.createFestivo(req.body);
    res.status(201).json(festivo);
  });
}
