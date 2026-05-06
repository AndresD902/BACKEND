import { Response } from 'express';
import { DepartamentoService, departamentoService } from '../services/department.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/async-handler.util';

export class DepartamentoController {
  constructor(private readonly service: DepartamentoService = departamentoService) {}

  public getColombiaList = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    res.status(200).json({ success: true, data: this.service.getColombiaList() });
  });

  public getAll = asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const departamentos = await this.service.getAll();
    res.status(200).json({ success: true, data: departamentos });
  });

  public getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dep = await this.service.getById(Number(req.params.id));
    res.status(200).json({ success: true, data: dep });
  });

  public create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { nombre, descripcion } = req.body as { nombre: string; descripcion?: string };
    const dep = await this.service.create(nombre, descripcion);
    res.status(201).json({ success: true, data: dep });
  });

  public update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const dep = await this.service.update(Number(req.params.id), req.body);
    res.status(200).json({ success: true, data: dep });
  });

  public delete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await this.service.delete(Number(req.params.id));
    res.status(200).json({ success: true, message: 'Departamento eliminado correctamente' });
  });
}

export const departamentoController = new DepartamentoController();
