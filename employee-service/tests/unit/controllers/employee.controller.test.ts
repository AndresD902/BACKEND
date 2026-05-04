import { Response, NextFunction } from 'express';
import { EmployeeController } from '../../../src/controllers/employee.controller';
import { IEmployeeService } from '../../../src/services/interfaces/employee.service.interface';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';
import { Empleado, CargoSalario, DocumentoEmpleado } from '../../../src/entities/employee.entity';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';

// ─── Helpers ──────────────────────────────────────────────────────────────

function req(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    params: {}, query: {}, body: {},
    headers: {},
    user: { id: '1', email: 'admin@empresa.com', rol: 'ADMIN' },
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

function res(): jest.Mocked<Response> {
  const r = {} as jest.Mocked<Response>;
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
}

const next = jest.fn() as unknown as NextFunction;

const fakeEmpleado = { id: 1, nombre: 'Juan' } as unknown as Empleado;
const fakeCargo = { id: 1, cargo: 'Dev' } as unknown as CargoSalario;
const fakeDoc = { id: 1, tipo: 'foto' } as unknown as DocumentoEmpleado;

// ─── Tests ────────────────────────────────────────────────────────────────

describe('EmployeeController', () => {
  let controller: EmployeeController;
  let service: jest.Mocked<IEmployeeService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = {
      getAll:                     jest.fn(),
      getById:                    jest.fn(),
      create:                     jest.fn(),
      update:                     jest.fn(),
      softDelete:                 jest.fn(),
      getCargoActual:             jest.fn(),
      getHistorialCargos:         jest.fn(),
      crearCargo:                 jest.fn(),
      getDocumentos:              jest.fn(),
      generarPresignedUrl:        jest.fn(),
      confirmarDocumento:         jest.fn(),
      generarUrlDescargaDocumento: jest.fn(),
    };
    controller = new EmployeeController(service);
  });

  // ─── getAll ─────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns 200 with paginated data using default page/limit', async () => {
      const data = { empleados: [], total: 0, page: 1, limit: 20 };
      service.getAll.mockResolvedValue(data);
      const r = res();
      await controller.getAll(req(), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
      expect(r.json).toHaveBeenCalledWith({ success: true, data });
      expect(service.getAll).toHaveBeenCalledWith(1, 20, { search: undefined, estado: undefined, departamento: undefined });
    });

    it('parses page and limit from query string', async () => {
      service.getAll.mockResolvedValue({ empleados: [], total: 0, page: 3, limit: 5 });
      await controller.getAll(req({ query: { page: '3', limit: '5' } }), res(), next);
      expect(service.getAll).toHaveBeenCalledWith(3, 5, { search: undefined, estado: undefined, departamento: undefined });
    });

    it('clamps page to minimum of 1', async () => {
      service.getAll.mockResolvedValue({ empleados: [], total: 0, page: 1, limit: 20 });
      await controller.getAll(req({ query: { page: '-10' } }), res(), next);
      expect(service.getAll).toHaveBeenCalledWith(1, 20, { search: undefined, estado: undefined, departamento: undefined });
    });

    it('calls next with error on failure', async () => {
      service.getAll.mockRejectedValue(new Error('db error'));
      await controller.getAll(req(), res(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── getById ────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns 200 with employee', async () => {
      service.getById.mockResolvedValue(fakeEmpleado);
      const r = res();
      await controller.getById(req({ params: { id: '1' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
      expect(r.json).toHaveBeenCalledWith({ success: true, data: fakeEmpleado });
    });

    it('calls next when employee not found', async () => {
      service.getById.mockRejectedValue(new NotFoundError());
      await controller.getById(req({ params: { id: '999' } }), res(), next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('returns 201 with created employee', async () => {
      service.create.mockResolvedValue(fakeEmpleado);
      const r = res();
      await controller.create(req({ body: { nombre: 'Juan' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(201);
    });

    it('forwards error to next', async () => {
      service.create.mockRejectedValue(new Error('conflict'));
      await controller.create(req(), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns 200 with updated employee', async () => {
      service.update.mockResolvedValue(fakeEmpleado);
      const r = res();
      await controller.update(req({ params: { id: '1' }, body: { celular: '300' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
    });

    it('forwards error to next', async () => {
      service.update.mockRejectedValue(new NotFoundError());
      await controller.update(req({ params: { id: '999' } }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── softDelete ─────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('returns 200 after deletion', async () => {
      service.softDelete.mockResolvedValue({ ...fakeEmpleado, estado: 'retirado' } as any);
      const r = res();
      await controller.softDelete(req({ params: { id: '1' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
    });

    it('forwards error to next', async () => {
      service.softDelete.mockRejectedValue(new NotFoundError());
      await controller.softDelete(req({ params: { id: '999' } }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getCargoActual ─────────────────────────────────────────────────────

  describe('getCargoActual', () => {
    it('returns 200 with null when no active cargo', async () => {
      service.getCargoActual.mockResolvedValue(null);
      const r = res();
      await controller.getCargoActual(req({ params: { id: '1' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
      expect(r.json).toHaveBeenCalledWith({ success: true, data: null });
    });

    it('returns 200 with cargo', async () => {
      service.getCargoActual.mockResolvedValue(fakeCargo);
      const r = res();
      await controller.getCargoActual(req({ params: { id: '1' } }), r, next);
      expect(r.json).toHaveBeenCalledWith({ success: true, data: fakeCargo });
    });

    it('forwards error to next', async () => {
      service.getCargoActual.mockRejectedValue(new NotFoundError());
      await controller.getCargoActual(req({ params: { id: '999' } }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getHistorialCargos ─────────────────────────────────────────────────

  describe('getHistorialCargos', () => {
    it('returns 200 with cargo history', async () => {
      service.getHistorialCargos.mockResolvedValue([fakeCargo]);
      const r = res();
      await controller.getHistorialCargos(req({ params: { id: '1' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
    });

    it('forwards error to next', async () => {
      service.getHistorialCargos.mockRejectedValue(new NotFoundError());
      await controller.getHistorialCargos(req({ params: { id: '999' } }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── crearCargo ─────────────────────────────────────────────────────────

  describe('crearCargo', () => {
    it('returns 201 with new cargo', async () => {
      service.crearCargo.mockResolvedValue(fakeCargo);
      const r = res();
      await controller.crearCargo(req({ params: { id: '1' }, body: { cargo: 'Dev', salario: 5000000, fecha_inicio: '2024-01-01' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(201);
    });

    it('forwards error to next', async () => {
      service.crearCargo.mockRejectedValue(new NotFoundError());
      await controller.crearCargo(req({ params: { id: '999' } }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── getDocumentos ──────────────────────────────────────────────────────

  describe('getDocumentos', () => {
    it('returns 200 with documents list', async () => {
      service.getDocumentos.mockResolvedValue([fakeDoc]);
      const r = res();
      await controller.getDocumentos(req({ params: { id: '1' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
    });

    it('forwards error to next', async () => {
      service.getDocumentos.mockRejectedValue(new NotFoundError());
      await controller.getDocumentos(req({ params: { id: '999' } }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── generarPresignedUrl ────────────────────────────────────────────────

  describe('generarPresignedUrl', () => {
    it('returns 200 with presigned url data', async () => {
      service.generarPresignedUrl.mockResolvedValue({ url: 'https://s3...', key: 'fotos/1.jpg' });
      const r = res();
      await controller.generarPresignedUrl(req({ body: { empleado_id: 1, tipo: 'foto', contentType: 'image/jpeg' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
      expect(r.json).toHaveBeenCalledWith({ success: true, data: { url: 'https://s3...', key: 'fotos/1.jpg' } });
    });

    it('forwards error to next', async () => {
      service.generarPresignedUrl.mockRejectedValue(new Error('S3 error'));
      await controller.generarPresignedUrl(req({ body: {} }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── confirmarDocumento ─────────────────────────────────────────────────

  describe('confirmarDocumento', () => {
    it('returns 201 with confirmed document', async () => {
      service.confirmarDocumento.mockResolvedValue(fakeDoc);
      const r = res();
      await controller.confirmarDocumento(req({ params: { id: '1' }, body: { tipo: 'foto', s3_key: 'fotos/1.jpg', s3_url: 'https://s3...' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(201);
    });

    it('forwards error to next', async () => {
      service.confirmarDocumento.mockRejectedValue(new NotFoundError());
      await controller.confirmarDocumento(req({ params: { id: '999' } }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ─── generarUrlDescarga ─────────────────────────────────────────────────

  describe('generarUrlDescarga', () => {
    it('returns 200 with download url', async () => {
      service.generarUrlDescargaDocumento.mockResolvedValue({ url: 'https://s3.download', expires_in: 3600 });
      const r = res();
      await controller.generarUrlDescarga(req({ params: { docId: '1' } }), r, next);
      expect(r.status).toHaveBeenCalledWith(200);
    });

    it('forwards error to next when document not found', async () => {
      service.generarUrlDescargaDocumento.mockRejectedValue(new NotFoundError());
      await controller.generarUrlDescarga(req({ params: { docId: '999' } }), res(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
