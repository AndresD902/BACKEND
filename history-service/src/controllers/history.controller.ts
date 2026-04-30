import { Request, Response, NextFunction } from 'express';
import { historyService } from '../services/history.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class HistoryController {
  async registrarCambio(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cambio = await historyService.registrarCambio(req.body);
      res.status(201).json({ success: true, data: cambio });
    } catch (err) { next(err); }
  }

  async registrarAccion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accion = await historyService.registrarAccion(req.body);
      res.status(201).json({ success: true, data: accion });
    } catch (err) { next(err); }
  }

  async getCambiosPorEmpleado(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const empleadoId = Number(req.params.id);
      const { entidad, entidad_id, desde, hasta, page = '1', limit = '50' } = req.query as Record<string, string>;
      const parsedLimit = Math.min(Number(limit), 100);
      const offset = (Number(page) - 1) * parsedLimit;

      const result = await historyService.getCambiosPorEmpleado(empleadoId, {
        entidad,
        entidad_id: entidad_id ? Number(entidad_id) : undefined,
        desde,
        hasta,
        limit: parsedLimit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: { ...result, page: Number(page), limit: parsedLimit },
      });
    } catch (err) { next(err); }
  }

  async getAcciones(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accion, resultado, usuario_email, desde, hasta, page = '1', limit = '50' } = req.query as Record<string, string>;
      const parsedLimit = Math.min(Number(limit), 100);
      const offset = (Number(page) - 1) * parsedLimit;

      const result = await historyService.getAcciones({
        accion,
        resultado,
        usuario_email,
        desde,
        hasta,
        limit: parsedLimit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: { ...result, page: Number(page), limit: parsedLimit },
      });
    } catch (err) { next(err); }
  }
}

export const historyController = new HistoryController();
