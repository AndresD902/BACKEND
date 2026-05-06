import { Response } from 'express';
import { IEmployeeService } from '../services/interfaces/employee.service.interface';
import { employeeService } from '../services/employee.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AuthenticatedUser } from '../types/authenticated-user.type';
import { asyncHandler } from '../utils/async-handler.util';
import { UnauthorizedError } from '../shared/errors/unauthorized.error';

function actor(req: AuthenticatedRequest): AuthenticatedUser {
  return req.user as AuthenticatedUser;
}

// Handlers are arrow function properties (not methods) so `this` is bound correctly
// when Express calls them without a class context (e.g. router.get('/', controller.getAll)).
export class EmployeeController {
  constructor(private readonly service: IEmployeeService = employeeService) {}

  public getAll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page         = Math.max(1, parseInt(String(req.query.page  ?? '1'), 10));
    const limit        = Math.max(1, parseInt(String(req.query.limit ?? '20'), 10));
    const search       = req.query.search       ? String(req.query.search).slice(0, 50)       : undefined;
    const estado       = req.query.estado       ? String(req.query.estado).toLowerCase()       : undefined;
    const departamento = req.query.departamento ? String(req.query.departamento)               : undefined;
    const result = await this.service.getAll(page, limit, { search, estado, departamento });
    res.status(200).json({ success: true, data: result });
  });

  public getById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const empleado = await this.service.getById(Number(req.params.id));
    res.status(200).json({ success: true, data: empleado });
  });

  public create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const empleado = await this.service.create(req.body, actor(req));
    res.status(201).json({ success: true, data: empleado });
  });

  public update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const empleado = await this.service.update(Number(req.params.id), req.body, actor(req));
    res.status(200).json({ success: true, data: empleado });
  });

  public softDelete = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const empleado = await this.service.softDelete(Number(req.params.id), actor(req));
    res.status(200).json({ success: true, data: empleado });
  });

  public getCargoActual = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const cargo = await this.service.getCargoActual(Number(req.params.id));
    res.status(200).json({ success: true, data: cargo });
  });

  public getHistorialCargos = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const historial = await this.service.getHistorialCargos(Number(req.params.id));
    res.status(200).json({ success: true, data: historial });
  });

  public getContratoLaboralActivo = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token requerido');
    }

    const contrato = await this.service.getContratoLaboralActivo(Number(req.params.id), authorizationHeader);
    res.status(200).json({ success: true, data: contrato });
  });

  public crearCargo = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const cargo = await this.service.crearCargo(Number(req.params.id), req.body, actor(req));
    res.status(201).json({ success: true, data: cargo });
  });

  public getDocumentos = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const docs = await this.service.getDocumentos(Number(req.params.id));
    res.status(200).json({ success: true, data: docs });
  });

  public generarPresignedUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.service.generarPresignedUrl(req.body);
    res.status(200).json({ success: true, data: result });
  });

  public confirmarDocumento = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const doc = await this.service.confirmarDocumento(Number(req.params.id), req.body, actor(req));
    res.status(201).json({ success: true, data: doc });
  });

  public generarUrlDescarga = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await this.service.generarUrlDescargaDocumento(Number(req.params.docId));
    res.status(200).json({ success: true, data: result });
  });
}

export const employeeController = new EmployeeController();
