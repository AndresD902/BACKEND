import { Response, NextFunction } from 'express';
import { employeeService } from '../services/employee.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AuthenticatedUser } from '../types/authenticated-user.type';

function actor(req: AuthenticatedRequest): AuthenticatedUser {
  return req.user as AuthenticatedUser;
}

export class EmployeeController {

  // GET /api/empleados?page=1&limit=20
  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page  = Math.max(1, parseInt(String(req.query.page  ?? '1'), 10));
      const limit = Math.max(1, parseInt(String(req.query.limit ?? '20'), 10));
      const result = await employeeService.getAll(page, limit);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  // GET /api/empleados/:id
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const empleado = await employeeService.getById(Number(req.params.id));
      res.status(200).json({ success: true, data: empleado });
    } catch (err) { next(err); }
  }

  // POST /api/empleados
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const empleado = await employeeService.create(req.body, actor(req));
      res.status(201).json({ success: true, data: empleado });
    } catch (err) { next(err); }
  }

  // PATCH /api/empleados/:id
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const empleado = await employeeService.update(Number(req.params.id), req.body, actor(req));
      res.status(200).json({ success: true, data: empleado });
    } catch (err) { next(err); }
  }

  // DELETE /api/empleados/:id  (soft delete → estado='retirado')
  async softDelete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const empleado = await employeeService.softDelete(Number(req.params.id), actor(req));
      res.status(200).json({ success: true, data: empleado });
    } catch (err) { next(err); }
  }

  // GET /api/empleados/:id/cargo-actual
  async getCargoActual(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cargo = await employeeService.getCargoActual(Number(req.params.id));
      res.status(200).json({ success: true, data: cargo });
    } catch (err) { next(err); }
  }

  // GET /api/empleados/:id/historial-cargo
  async getHistorialCargos(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const historial = await employeeService.getHistorialCargos(Number(req.params.id));
      res.status(200).json({ success: true, data: historial });
    } catch (err) { next(err); }
  }

  // POST /api/empleados/:id/cargo
  async crearCargo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const cargo = await employeeService.crearCargo(Number(req.params.id), req.body, actor(req));
      res.status(201).json({ success: true, data: cargo });
    } catch (err) { next(err); }
  }

  // GET /api/empleados/:id/documentos
  async getDocumentos(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const docs = await employeeService.getDocumentos(Number(req.params.id));
      res.status(200).json({ success: true, data: docs });
    } catch (err) { next(err); }
  }

  // POST /api/empleados/presigned-url
  async generarPresignedUrl(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.generarPresignedUrl(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }

  // POST /api/empleados/:id/documentos
  async confirmarDocumento(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const doc = await employeeService.confirmarDocumento(Number(req.params.id), req.body, actor(req));
      res.status(201).json({ success: true, data: doc });
    } catch (err) { next(err); }
  }

  // GET /api/empleados/documentos/:docId/url
  async generarUrlDescarga(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await employeeService.generarUrlDescargaDocumento(Number(req.params.docId));
      res.status(200).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
}

export const employeeController = new EmployeeController();
