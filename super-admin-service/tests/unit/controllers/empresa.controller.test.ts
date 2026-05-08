import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';

vi.mock('../../../src/services/empresa.service', () => ({
  empresaService: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    actualizarEstado: vi.fn(),
    agregarAdmin: vi.fn(),
    listarEmpleados: vi.fn(),
  },
}));

import { empresaService } from '../../../src/services/empresa.service';
import { EmpresaController } from '../../../src/controller/empresa.controller';
import { EstadoEmpresa } from '../../../src/shared/enums/estado-empresa.enum';

const mockEmpresaService = vi.mocked(empresaService);

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, _json: json } as unknown as Response & { _json: typeof json };
}

function makeReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    body: {},
    query: {},
    params: {},
    headers: { authorization: 'Bearer test-token' },
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

describe('EmpresaController', () => {
  let ctrl: EmpresaController;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    ctrl = new EmpresaController();
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('listar', () => {
    it('retorna lista paginada de empresas con status 200', async () => {
      const listaData = { empresas: [], total: 0, page: 1, limit: 20 };
      mockEmpresaService.listar.mockResolvedValue(listaData);
      const req = makeReq({ query: { page: '2', limit: '10' } });
      const res = makeRes();

      ctrl.listar(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockEmpresaService.listar).toHaveBeenCalledWith(2, 10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json).toHaveBeenCalledWith({ success: true, data: listaData });
    });

    it('usa valores por defecto si no se pasan query params', async () => {
      mockEmpresaService.listar.mockResolvedValue({ empresas: [], total: 0, page: 1, limit: 20 });
      const req = makeReq({ query: {} });
      const res = makeRes();

      ctrl.listar(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockEmpresaService.listar).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('obtener', () => {
    it('retorna empresa por id con status 200', async () => {
      const empresa = { id: 1, nombre: 'Tech SAS', admins: [] };
      mockEmpresaService.obtenerPorId.mockResolvedValue(empresa as never);
      const req = makeReq({ params: { id: '1' } });
      const res = makeRes();

      ctrl.obtener(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockEmpresaService.obtenerPorId).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('pasa el error a next si el servicio lanza', async () => {
      mockEmpresaService.obtenerPorId.mockRejectedValue(new Error('not found'));
      const req = makeReq({ params: { id: '99' } });
      const res = makeRes();

      ctrl.obtener(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('crear', () => {
    it('crea empresa y responde 201', async () => {
      const creado = { empresa: { id: 1 }, admins: [] };
      mockEmpresaService.crear.mockResolvedValue(creado as never);
      const req = makeReq({ body: { nombre: 'Tech SAS', nit: '900123', correo: 'a@b.com', plan: 'basico' } });
      const res = makeRes();

      ctrl.crear(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res._json).toHaveBeenCalledWith({ success: true, data: creado });
    });
  });

  describe('actualizar', () => {
    it('actualiza empresa y responde 200', async () => {
      const actualizado = { id: 1, nombre: 'Tech SAS v2' };
      mockEmpresaService.actualizar.mockResolvedValue(actualizado as never);
      const req = makeReq({ params: { id: '1' }, body: { nombre: 'Tech SAS v2' } });
      const res = makeRes();

      ctrl.actualizar(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockEmpresaService.actualizar).toHaveBeenCalledWith(1, { nombre: 'Tech SAS v2' });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('actualizarEstado', () => {
    it('actualiza estado y responde 200', async () => {
      const actualizado = { id: 1, estado: 'inactiva' };
      mockEmpresaService.actualizarEstado.mockResolvedValue(actualizado as never);
      const req = makeReq({ params: { id: '1' }, body: { estado: EstadoEmpresa.INACTIVA } });
      const res = makeRes();

      ctrl.actualizarEstado(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockEmpresaService.actualizarEstado).toHaveBeenCalledWith(1, EstadoEmpresa.INACTIVA);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('agregarAdmin', () => {
    it('agrega admin y responde 201', async () => {
      const admin = { id: 2, empresa_id: 1, email: 'nuevo@empresa.com' };
      mockEmpresaService.agregarAdmin.mockResolvedValue(admin as never);
      const req = makeReq({ params: { id: '1' }, body: { nombre: 'Admin Nuevo', email: 'nuevo@empresa.com' } });
      const res = makeRes();

      ctrl.agregarAdmin(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockEmpresaService.agregarAdmin).toHaveBeenCalledWith(1, { nombre: 'Admin Nuevo', email: 'nuevo@empresa.com' });
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('listarEmpleados', () => {
    it('retorna empleados con status 200', async () => {
      const empleados = [{ id: 1, nombre: 'Juan', detalle_estado: 'Trabajando actualmente' }];
      mockEmpresaService.listarEmpleados.mockResolvedValue(empleados as never);
      const req = makeReq({ params: { id: '1' }, headers: { authorization: 'Bearer token123' } });
      const res = makeRes();

      ctrl.listarEmpleados(req as unknown as Request, res as unknown as Response, next as NextFunction);
      await new Promise((r) => setImmediate(r));

      expect(mockEmpresaService.listarEmpleados).toHaveBeenCalledWith(1, 'Bearer token123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json).toHaveBeenCalledWith({ success: true, data: empleados });
    });
  });
});
