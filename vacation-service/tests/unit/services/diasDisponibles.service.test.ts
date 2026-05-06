import { DiasDisponiblesService } from '../../../src/services/diasDisponibles.service';
import { DiasDisponiblesRepository } from '../../../src/repositories/diasDisponibles.repository';
import { DiasDisponibles } from '../../../src/entities/diasDisponibles.entity';

jest.mock('../../../src/config/env', () => ({
  env: { diasLegalesAnuales: 15 },
}));

function makeRepo(): jest.Mocked<DiasDisponiblesRepository> {
  return {
    findByEmpleadoAnio:    jest.fn(),
    create:                jest.fn(),
    incrementarPendientes: jest.fn(),
    aprobar:               jest.fn(),
    liberarPendientes:     jest.fn(),
  } as unknown as jest.Mocked<DiasDisponiblesRepository>;
}

function fakeRegistro(override: Partial<DiasDisponibles> = {}): DiasDisponibles {
  return {
    id: 1, empleadoId: 10, anio: 2025,
    diasTotales: 15, diasUsados: 0, diasPendientes: 0, diasDisponibles: 15,
    fechaCreacion: new Date(), fechaActualizacion: new Date(),
    ...override,
  };
}

describe('DiasDisponiblesService', () => {
  let repo: jest.Mocked<DiasDisponiblesRepository>;
  let svc:  DiasDisponiblesService;

  beforeEach(() => {
    repo = makeRepo();
    svc  = new DiasDisponiblesService(repo);
  });

  describe('obtenerOCrear', () => {
    it('returns existing record when it exists', async () => {
      const registro = fakeRegistro();
      repo.findByEmpleadoAnio.mockResolvedValue(registro);
      const result = await svc.obtenerOCrear(10, 2025);
      expect(result).toBe(registro);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates a new record when none exists', async () => {
      const nuevo = fakeRegistro();
      repo.findByEmpleadoAnio.mockResolvedValue(null);
      repo.create.mockResolvedValue(nuevo);
      const result = await svc.obtenerOCrear(10, 2025);
      expect(repo.create).toHaveBeenCalledWith(10, 2025, 15);
      expect(result).toBe(nuevo);
    });

    it('uses current year when anio is not provided', async () => {
      const registro = fakeRegistro({ anio: new Date().getFullYear() });
      repo.findByEmpleadoAnio.mockResolvedValue(registro);
      await svc.obtenerOCrear(10);
      expect(repo.findByEmpleadoAnio).toHaveBeenCalledWith(10, new Date().getFullYear());
    });
  });

  describe('obtenerPorEmpleado', () => {
    it('returns the record for the current year', async () => {
      const registro = fakeRegistro();
      repo.findByEmpleadoAnio.mockResolvedValue(registro);
      const result = await svc.obtenerPorEmpleado(10);
      expect(result).toBe(registro);
    });

    it('returns null when no record exists', async () => {
      repo.findByEmpleadoAnio.mockResolvedValue(null);
      const result = await svc.obtenerPorEmpleado(10);
      expect(result).toBeNull();
    });
  });
});
