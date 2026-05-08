import { Request, Response, NextFunction } from 'express';
import { VacationService } from '../services/vacation.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler.util';
import { EstadoVacacion } from '../entities/vacation.entity';

/**
 * HTTP layer for vacation-related endpoints.
 *
 * Each method extracts and validates route/query params, delegates all
 * business logic to `VacationService`, and writes the HTTP response.
 * Errors are forwarded to the centralized error handler via `asyncHandler`.
 */
export class VacationController {
  constructor(private readonly vacationService: VacationService) {}

  /** `GET /` — list vacation requests with optional filters. */
  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const empleadoId = req.query.empleado_id ? parseInt(String(req.query.empleado_id), 10) : undefined;
    const vacaciones = await this.vacationService.getAll({
      empleadoId: Number.isFinite(empleadoId) ? empleadoId : undefined,
      estado: req.query.estado ? String(req.query.estado) as EstadoVacacion : undefined,
      desde: req.query.desde ? String(req.query.desde) : undefined,
      hasta: req.query.hasta ? String(req.query.hasta) : undefined,
    });
    res.status(200).json(vacaciones);
  });

  /** `GET /empleado/:id` — list all vacation requests for an employee. */
  getByEmpleadoId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const empleadoId = parseInt(String(req.params.id), 10);
    const vacaciones = await this.vacationService.getByEmpleadoId(empleadoId);
    res.status(200).json(vacaciones);
  });

  /** `GET /empleado/:id/disponibles` — available vacation days for the current year. */
  getDiasDisponibles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const empleadoId = parseInt(String(req.params.id), 10);
    const query = req.query ?? {};
    const createParam = String(query.crear ?? query.create ?? '').toLowerCase();
    const createIfMissing = ['true', '1', 'si', 'sí', 'yes'].includes(createParam);
    const dias = await this.vacationService.getDiasDisponibles(empleadoId, { createIfMissing });
    res.status(200).json(dias);
  });

  /** `POST /` — create a new vacation request (validated by `createVacationSchema`). */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const actor    = req.user!;
    const ip       = req.ip ?? '';
    const userAgent = req.headers['user-agent'] ?? '';
    const solicitud = await this.vacationService.create(req.body, actor, ip, userAgent);
    res.status(201).json(solicitud);
  });

  /** `PATCH /:id/aprobar` — approve a pending vacation request. */
  aprobar = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const id        = parseInt(String(req.params.id), 10);
    const actor     = req.user!;
    const ip        = req.ip ?? '';
    const userAgent  = req.headers['user-agent'] ?? '';
    const actualizada = await this.vacationService.aprobar(id, actor, ip, userAgent);
    res.status(200).json(actualizada);
  });

  /** `PATCH /:id/rechazar` — reject a pending vacation request with a mandatory reason. */
  rechazar = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const id        = parseInt(String(req.params.id), 10);
    const actor     = req.user!;
    const ip        = req.ip ?? '';
    const userAgent  = req.headers['user-agent'] ?? '';
    const actualizada = await this.vacationService.rechazar(id, req.body.motivo_rechazo, actor, ip, userAgent);
    res.status(200).json(actualizada);
  });

  /** `PATCH /:id/cancelar` — cancel a pending vacation request (employee-initiated). */
  cancelar = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const id        = parseInt(String(req.params.id), 10);
    const actor     = req.user!;
    const ip        = req.ip ?? '';
    const userAgent  = req.headers['user-agent'] ?? '';
    const actualizada = await this.vacationService.cancelar(id, actor, ip, userAgent);
    res.status(200).json(actualizada);
  });

  /** `GET /festivos/:anio` — list all active public holidays for a year. */
  getFestivosByAnio = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const anio     = parseInt(String(req.params.anio), 10);
    const festivos = await this.vacationService.getFestivosByAnio(anio);
    res.status(200).json(festivos);
  });

  /** `POST /festivos` — create a new public holiday (admin only). */
  createFestivo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const festivo = await this.vacationService.createFestivo(req.body);
    res.status(201).json(festivo);
  });
}
