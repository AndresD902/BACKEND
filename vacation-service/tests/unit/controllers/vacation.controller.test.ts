import { Request, Response, NextFunction } from 'express';
import { VacationController } from '../../../src/controller/vacation.controller';
import { VacationService } from '../../../src/services/vacation.service';
import { AuthenticatedRequest } from '../../../src/middlewares/auth.middleware';
import { Vacation } from '../../../src/entities/vacation.entity';
import { DiasDisponibles } from '../../../src/entities/diasDisponibles.entity';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';

function makeSvc(): jest.Mocked<VacationService> {
  return {
    getByEmpleadoId:    jest.fn(),
    getDiasDisponibles: jest.fn(),
    create:             jest.fn(),
    aprobar:            jest.fn(),
    rechazar:           jest.fn(),
    cancelar:           jest.fn(),
    getFestivosByAnio:  jest.fn(),
    createFestivo:      jest.fn(),
  } as unknown as jest.Mocked<VacationService>;
}

function makeRes() {
  const json   = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, _json: json } as unknown as Response & { _json: jest.Mock };
}

const ACTOR = { sub: '1', email: 'hr@empresa.com', role: 'HR' as const };

function fakeVacation(estado: Vacation['estado'] = 'pendiente'): Vacation {
  return {
    id: 1, empleadoId: 5,
    fechaInicio: new Date('2025-09-01'), fechaFin: new Date('2025-09-05'),
    diasHabiles: 5, diasCalendario: 5, estado,
    justificacion: null, motivoRechazo: null, aprobadoPor: null,
    fechaAprobacion: null, notificado: false,
    fechaSolicitud: new Date(), fechaActualizacion: new Date(),
  };
}

function fakeDias(): DiasDisponibles {
  return {
    id: 1, empleadoId: 5, anio: 2025,
    diasTotales: 15, diasUsados: 0, diasPendientes: 0, diasDisponibles: 15,
    fechaCreacion: new Date(), fechaActualizacion: new Date(),
  };
}

describe('VacationController', () => {
  let svc:  jest.Mocked<VacationService>;
  let ctrl: VacationController;

  beforeEach(() => {
    svc  = makeSvc();
    ctrl = new VacationController(svc);
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────────────
  describe('getByEmpleadoId', () => {
    it('responds 200 with the vacation list', async () => {
      const list = [fakeVacation()];
      svc.getByEmpleadoId.mockResolvedValue(list);
      const req  = { params: { id: '5' } } as unknown as Request;
      const res  = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      await ctrl.getByEmpleadoId(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect((res as unknown as { _json: jest.Mock })._json).toHaveBeenCalledWith(list);
    });

    it('calls next with the error when service throws', async () => {
      svc.getByEmpleadoId.mockRejectedValue(new NotFoundError());
      const req  = { params: { id: '99' } } as unknown as Request;
      const res  = makeRes();
      const next = jest.fn() as unknown as NextFunction;

      ctrl.getByEmpleadoId(req, res, next);
      // asyncHandler returns void; flush microtask queue so .catch(next) runs
      await new Promise(resolve => setImmediate(resolve));
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  // ──────────────────────────────────────────────
  describe('getDiasDisponibles', () => {
    it('responds 200 with the dias record', async () => {
      svc.getDiasDisponibles.mockResolvedValue(fakeDias());
      const req  = { params: { id: '5' } } as unknown as Request;
      const res  = makeRes();

      await ctrl.getDiasDisponibles(req, res, jest.fn() as unknown as NextFunction);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ──────────────────────────────────────────────
  describe('create', () => {
    it('responds 201 with the created vacation', async () => {
      const vacation = fakeVacation();
      svc.create.mockResolvedValue(vacation);
      const req = {
        body:    { empleado_id: 5, fecha_inicio: '2025-09-01', fecha_fin: '2025-09-05' },
        user:    ACTOR,
        ip:      '127.0.0.1',
        headers: { 'user-agent': 'Jest' },
      } as unknown as AuthenticatedRequest;
      const res  = makeRes();

      await ctrl.create(req, res, jest.fn() as unknown as NextFunction);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ──────────────────────────────────────────────
  describe('aprobar', () => {
    it('responds 200 with the updated vacation', async () => {
      svc.aprobar.mockResolvedValue(fakeVacation('aprobada'));
      const req = {
        params:  { id: '1' },
        user:    ACTOR,
        ip:      '',
        headers: { 'user-agent': '' },
      } as unknown as AuthenticatedRequest;
      const res = makeRes();

      await ctrl.aprobar(req, res, jest.fn() as unknown as NextFunction);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ──────────────────────────────────────────────
  describe('rechazar', () => {
    it('responds 200 with the updated vacation', async () => {
      svc.rechazar.mockResolvedValue(fakeVacation('rechazada'));
      const req = {
        params:  { id: '1' },
        body:    { motivo_rechazo: 'Sin presupuesto' },
        user:    ACTOR,
        ip:      '',
        headers: { 'user-agent': '' },
      } as unknown as AuthenticatedRequest;
      const res = makeRes();

      await ctrl.rechazar(req, res, jest.fn() as unknown as NextFunction);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ──────────────────────────────────────────────
  describe('cancelar', () => {
    it('responds 200 with the updated vacation', async () => {
      svc.cancelar.mockResolvedValue(fakeVacation('cancelada'));
      const req = {
        params:  { id: '1' },
        user:    ACTOR,
        ip:      '',
        headers: { 'user-agent': '' },
      } as unknown as AuthenticatedRequest;
      const res = makeRes();

      await ctrl.cancelar(req, res, jest.fn() as unknown as NextFunction);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ──────────────────────────────────────────────
  describe('getFestivosByAnio', () => {
    it('responds 200 with the festivos list', async () => {
      svc.getFestivosByAnio.mockResolvedValue([]);
      const req = { params: { anio: '2025' } } as unknown as Request;
      const res = makeRes();

      await ctrl.getFestivosByAnio(req, res, jest.fn() as unknown as NextFunction);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ──────────────────────────────────────────────
  describe('createFestivo', () => {
    it('responds 201 with the new festivo', async () => {
      const festivo = { id: 1, fecha: new Date(), descripcion: 'Festivo', anio: 2025, tipo: 'nacional' as const, activo: true };
      svc.createFestivo.mockResolvedValue(festivo);
      const req = {
        body: { fecha: '2025-01-01', descripcion: 'Festivo', anio: 2025 },
      } as unknown as Request;
      const res = makeRes();

      await ctrl.createFestivo(req, res, jest.fn() as unknown as NextFunction);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
