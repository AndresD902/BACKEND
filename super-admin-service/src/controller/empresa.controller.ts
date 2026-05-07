import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { empresaService } from '../services/empresa.service';
import { asyncHandler } from '../utils/async-handler.util';
import { EstadoEmpresa } from '../shared/enums/estado-empresa.enum';

export class EmpresaController {
  // GET /api/super-admin/empresas
  public listar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page  = Number(req.query['page']  ?? 1);
    const limit = Number(req.query['limit'] ?? 20);
    const data  = await empresaService.listar(page, limit);
    res.status(200).json({ success: true, data });
  });

  // GET /api/super-admin/empresas/:id
  public obtener = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await empresaService.obtenerPorId(Number(req.params['id']));
    res.status(200).json({ success: true, data });
  });

  // POST /api/super-admin/empresas
  public crear = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await empresaService.crear(req.body);
    res.status(201).json({ success: true, data });
  });

  // PATCH /api/super-admin/empresas/:id
  public actualizar = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await empresaService.actualizar(Number(req.params['id']), req.body);
    res.status(200).json({ success: true, data });
  });

  // PATCH /api/super-admin/empresas/:id/estado
  public actualizarEstado = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { estado } = req.body as { estado: EstadoEmpresa };
    const data = await empresaService.actualizarEstado(Number(req.params['id']), estado);
    res.status(200).json({ success: true, data });
  });

  // POST /api/super-admin/empresas/:id/admins
  public agregarAdmin = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const data = await empresaService.agregarAdmin(Number(req.params['id']), req.body);
    res.status(201).json({ success: true, data });
  });

  // GET /api/super-admin/empresas/:id/empleados
  public listarEmpleados = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const token = req.headers.authorization ?? '';
    const data  = await empresaService.listarEmpleados(Number(req.params['id']), token);
    res.status(200).json({ success: true, data });
  });
}

export const empresaController = new EmpresaController();
