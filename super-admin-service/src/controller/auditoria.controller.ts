import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { auditoriaService } from '../services/auditoria.service';
import { asyncHandler } from '../utils/async-handler.util';

export class AuditoriaController {
  // GET /api/super-admin/auditoria/acciones
  public acciones = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const params: Record<string, unknown> = {};
    if (req.query['empresa'])    params['empresa']    = String(req.query['empresa']);
    if (req.query['accion'])     params['accion']     = String(req.query['accion']);
    if (req.query['desde'])      params['desde']      = String(req.query['desde']);
    if (req.query['hasta'])      params['hasta']      = String(req.query['hasta']);
    if (req.query['email'])      params['email']      = String(req.query['email']);
    if (req.query['page'])       params['page']       = String(req.query['page']);
    if (req.query['limit'])      params['limit']      = String(req.query['limit']);

    const token = req.headers.authorization ?? '';
    const data  = await auditoriaService.obtenerAcciones(token, params);
    res.status(200).json({ success: true, data });
  });

  // GET /api/super-admin/auditoria/cambios
  public cambios = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const params: Record<string, unknown> = {};
    if (req.query['empresa'])    params['empresa']    = String(req.query['empresa']);
    if (req.query['tipo'])       params['tipo']       = String(req.query['tipo']);
    if (req.query['desde'])      params['desde']      = String(req.query['desde']);
    if (req.query['hasta'])      params['hasta']      = String(req.query['hasta']);
    if (req.query['email'])      params['email']      = String(req.query['email']);
    if (req.query['page'])       params['page']       = String(req.query['page']);
    if (req.query['limit'])      params['limit']      = String(req.query['limit']);

    const token = req.headers.authorization ?? '';
    const data  = await auditoriaService.obtenerCambios(token, params);
    res.status(200).json({ success: true, data });
  });
}

export const auditoriaController = new AuditoriaController();
