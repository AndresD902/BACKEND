import { VacationService } from '../../../src/services/vacation.service';
import { VacationRepository } from '../../../src/repositories/vacation.repository';
import { DiasDisponiblesRepository } from '../../../src/repositories/diasDisponibles.repository';
import { FestivosRepository } from '../../../src/repositories/festivos.repository';
import { EmailService } from '../../../src/services/email.service';
import { Vacation } from '../../../src/entities/vacation.entity';
import { DiasDisponibles } from '../../../src/entities/diasDisponibles.entity';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { BadRequestError } from '../../../src/shared/errors/bad-request.error';
import { ConflictError } from '../../../src/shared/errors/conflict.error';
import { AuthenticatedUser } from '../../../src/middlewares/auth.middleware';

jest.mock('../../../src/clients/historyServiceClient', () => ({
  registrarCambio: jest.fn(),
}));
jest.mock('../../../src/config/env', () => ({
  env: { diasLegalesAnuales: 15, historyServiceUrl: 'http://history', employeeServiceUrl: 'http://employee' },
}));

// Fechas seguras: inicio 45 días en el futuro (lunes), fin 50 días
function nextMonday(fromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + fromNow);
  // avanzar hasta el próximo lunes
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

const INICIO_STR = nextMonday(40);
const FIN_STR    = (() => {
  const d = new Date(`${INICIO_STR}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 6); // lunes + 6 días = domingo (5 días hábiles)
  return d.toISOString().split('T')[0];
})();

const ACTOR: AuthenticatedUser = { sub: '99', email: 'hr@empresa.com', role: 'HR' };

function makeVacationRepo(): jest.Mocked<VacationRepository> {
  return {
    findByEmpleadoId: jest.fn(),
    findById:         jest.fn(),
    create:           jest.fn(),
    updateEstado:     jest.fn(),
    markNotificado:   jest.fn(),
    findSolapadas:    jest.fn(),
  } as unknown as jest.Mocked<VacationRepository>;
}

function makeDiasRepo(): jest.Mocked<DiasDisponiblesRepository> {
  return {
    findByEmpleadoAnio:    jest.fn(),
    create:                jest.fn(),
    incrementarPendientes: jest.fn(),
    aprobar:               jest.fn(),
    liberarPendientes:     jest.fn(),
  } as unknown as jest.Mocked<DiasDisponiblesRepository>;
}

function makeFestivosRepo(): jest.Mocked<FestivosRepository> {
  return {
    findByAnio:    jest.fn(),
    findByRango:   jest.fn().mockResolvedValue([]),
    existeFestivo: jest.fn().mockResolvedValue(false),
    create:        jest.fn(),
  } as unknown as jest.Mocked<FestivosRepository>;
}

function makeEmailService(): jest.Mocked<EmailService> {
  return {
    notificarSolicitudRRHH: jest.fn().mockResolvedValue(undefined),
    notificarAprobacion:    jest.fn().mockResolvedValue(undefined),
    notificarRechazo:       jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<EmailService>;
}

function fakeDias(override: Partial<DiasDisponibles> = {}): DiasDisponibles {
  return {
    id: 1, empleadoId: 5, anio: new Date().getFullYear(),
    diasTotales: 15, diasUsados: 0, diasPendientes: 0, diasDisponibles: 15,
    fechaCreacion: new Date(), fechaActualizacion: new Date(),
    ...override,
  };
}

function fakeVacation(override: Partial<Vacation> = {}): Vacation {
  return {
    id: 1, empleadoId: 5,
    fechaInicio: new Date(`${INICIO_STR}T00:00:00.000Z`),
    fechaFin:    new Date(`${FIN_STR}T00:00:00.000Z`),
    diasHabiles: 5, diasCalendario: 7,
    estado: 'pendiente',
    justificacion: null, motivoRechazo: null, aprobadoPor: null, fechaAprobacion: null,
    notificado: false,
    fechaSolicitud: new Date(), fechaActualizacion: new Date(),
    ...override,
  };
}

describe('VacationService', () => {
  let vacationRepo:  jest.Mocked<VacationRepository>;
  let diasRepo:      jest.Mocked<DiasDisponiblesRepository>;
  let festivosRepo:  jest.Mocked<FestivosRepository>;
  let emailService:  jest.Mocked<EmailService>;
  let svc:           VacationService;

  beforeEach(() => {
    vacationRepo = makeVacationRepo();
    diasRepo     = makeDiasRepo();
    festivosRepo = makeFestivosRepo();
    emailService = makeEmailService();
    svc = new VacationService(vacationRepo, diasRepo, festivosRepo, emailService);
    jest.clearAllMocks();
    festivosRepo.findByRango.mockResolvedValue([]);
    festivosRepo.existeFestivo.mockResolvedValue(false);
  });

  // ──────────────────────────────────────────────
  describe('getByEmpleadoId', () => {
    it('returns the list from the repository', async () => {
      const list = [fakeVacation()];
      vacationRepo.findByEmpleadoId.mockResolvedValue(list);
      const result = await svc.getByEmpleadoId(5);
      expect(result).toBe(list);
    });
  });

  // ──────────────────────────────────────────────
  describe('getDiasDisponibles', () => {
    it('returns the record when it exists', async () => {
      const registro = fakeDias();
      diasRepo.findByEmpleadoAnio.mockResolvedValue(registro);
      const result = await svc.getDiasDisponibles(5);
      expect(result).toBe(registro);
    });

    it('throws NotFoundError when no record exists', async () => {
      diasRepo.findByEmpleadoAnio.mockResolvedValue(null);
      await expect(svc.getDiasDisponibles(5)).rejects.toThrow(NotFoundError);
    });
  });

  // ──────────────────────────────────────────────
  describe('create', () => {
    const body = { empleado_id: 5, fecha_inicio: INICIO_STR, fecha_fin: FIN_STR };

    beforeEach(() => {
      diasRepo.findByEmpleadoAnio.mockResolvedValue(fakeDias());
      vacationRepo.findSolapadas.mockResolvedValue([]);
      vacationRepo.create.mockResolvedValue(fakeVacation());
      diasRepo.incrementarPendientes.mockResolvedValue(undefined);
      vacationRepo.markNotificado.mockResolvedValue(undefined);
    });

    it('creates a vacation and returns it with notificado=true', async () => {
      const result = await svc.create(body, ACTOR, '127.0.0.1', 'Jest');
      expect(vacationRepo.create).toHaveBeenCalled();
      expect(result.notificado).toBe(true);
    });

    it('throws ConflictError when a overlapping vacation exists', async () => {
      vacationRepo.findSolapadas.mockResolvedValue([fakeVacation()]);
      await expect(svc.create(body, ACTOR, '', '')).rejects.toThrow(ConflictError);
    });

    it('throws BadRequestError when the employee has insufficient days', async () => {
      diasRepo.findByEmpleadoAnio.mockResolvedValue(fakeDias({ diasDisponibles: 2 }));
      await expect(svc.create(body, ACTOR, '', '')).rejects.toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('aprobar', () => {
    it('updates estado to aprobada and calls diasRepo.aprobar', async () => {
      const vacation = fakeVacation({ estado: 'pendiente' });
      const updated  = fakeVacation({ estado: 'aprobada' });
      vacationRepo.findById.mockResolvedValue(vacation);
      vacationRepo.updateEstado.mockResolvedValue(updated);
      diasRepo.aprobar.mockResolvedValue(undefined);

      const result = await svc.aprobar(1, ACTOR, '', '');
      expect(vacationRepo.updateEstado).toHaveBeenCalledWith(1, 'aprobada', ACTOR.email);
      expect(diasRepo.aprobar).toHaveBeenCalled();
      expect(result.estado).toBe('aprobada');
    });

    it('throws NotFoundError when vacation does not exist', async () => {
      vacationRepo.findById.mockResolvedValue(null);
      await expect(svc.aprobar(99, ACTOR, '', '')).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError when vacation is not pending', async () => {
      vacationRepo.findById.mockResolvedValue(fakeVacation({ estado: 'aprobada' }));
      await expect(svc.aprobar(1, ACTOR, '', '')).rejects.toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('rechazar', () => {
    it('updates estado to rechazada and frees dias pendientes', async () => {
      const vacation = fakeVacation({ estado: 'pendiente' });
      const updated  = fakeVacation({ estado: 'rechazada' });
      vacationRepo.findById.mockResolvedValue(vacation);
      vacationRepo.updateEstado.mockResolvedValue(updated);
      diasRepo.liberarPendientes.mockResolvedValue(undefined);

      const result = await svc.rechazar(1, 'motivo', ACTOR, '', '');
      expect(vacationRepo.updateEstado).toHaveBeenCalledWith(1, 'rechazada', ACTOR.email, 'motivo');
      expect(diasRepo.liberarPendientes).toHaveBeenCalled();
      expect(result.estado).toBe('rechazada');
    });

    it('throws NotFoundError when vacation does not exist', async () => {
      vacationRepo.findById.mockResolvedValue(null);
      await expect(svc.rechazar(99, 'motivo', ACTOR, '', '')).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError when vacation is not pending', async () => {
      vacationRepo.findById.mockResolvedValue(fakeVacation({ estado: 'rechazada' }));
      await expect(svc.rechazar(1, 'motivo', ACTOR, '', '')).rejects.toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('cancelar', () => {
    it('updates estado to cancelada and frees dias pendientes', async () => {
      const vacation = fakeVacation({ estado: 'pendiente' });
      const updated  = fakeVacation({ estado: 'cancelada' });
      vacationRepo.findById.mockResolvedValue(vacation);
      vacationRepo.updateEstado.mockResolvedValue(updated);
      diasRepo.liberarPendientes.mockResolvedValue(undefined);

      const result = await svc.cancelar(1, ACTOR, '', '');
      expect(vacationRepo.updateEstado).toHaveBeenCalledWith(1, 'cancelada', ACTOR.email);
      expect(diasRepo.liberarPendientes).toHaveBeenCalled();
      expect(result.estado).toBe('cancelada');
    });

    it('throws NotFoundError when vacation does not exist', async () => {
      vacationRepo.findById.mockResolvedValue(null);
      await expect(svc.cancelar(99, ACTOR, '', '')).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError when vacation is not pending', async () => {
      vacationRepo.findById.mockResolvedValue(fakeVacation({ estado: 'aprobada' }));
      await expect(svc.cancelar(1, ACTOR, '', '')).rejects.toThrow(BadRequestError);
    });
  });

  // ──────────────────────────────────────────────
  describe('getFestivosByAnio', () => {
    it('delegates to festivosRepo', async () => {
      const festivos = [{ id: 1, fecha: new Date(), descripcion: 'Año Nuevo', anio: 2025, tipo: 'nacional' as const, activo: true }];
      festivosRepo.findByAnio.mockResolvedValue(festivos);
      const result = await svc.getFestivosByAnio(2025);
      expect(result).toBe(festivos);
    });
  });

  // ──────────────────────────────────────────────
  describe('createFestivo', () => {
    it('delegates to festivosRepo', async () => {
      const festivo = { id: 1, fecha: new Date(), descripcion: 'Festivo', anio: 2025, tipo: 'nacional' as const, activo: true };
      festivosRepo.create.mockResolvedValue(festivo);
      const result = await svc.createFestivo({ fecha: '2025-01-01', descripcion: 'Festivo', anio: 2025 });
      expect(result).toBe(festivo);
    });
  });
});
