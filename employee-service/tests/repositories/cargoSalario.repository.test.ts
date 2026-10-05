import { CargoSalarioRepository } from '../../src/repositories/cargoSalario.repository';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn() },
}));

const mockQuery = pool.query as jest.Mock;

describe('CargoSalarioRepository', () => {
  let repo: CargoSalarioRepository;

  beforeEach(() => {
    repo = new CargoSalarioRepository();
    jest.clearAllMocks();
  });

  describe('findActivo', () => {
    it('should return the active contract for an employee', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, activo: true }] });
      const result = await repo.findActivo(7);
      expect(result).toEqual({ id: 1, activo: true });
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('activo = TRUE'), [7]);
    });

    it('should return null when there is no active contract', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repo.findActivo(99);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all contracts for an employee', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });
      const result = await repo.findAll(7);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('empleado_id'), [7]);
    });
  });

  describe('cerrarActivo', () => {
    it('should close the active contract and set fecha_fin', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repo.cerrarActivo(7);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('activo = FALSE'),
        [7],
      );
    });
  });

  describe('create', () => {
    it('should insert a new cargo/salario record and return it', async () => {
      const data = { empleado_id: 7, cargo: 'Dev', salario: 5000000 };
      mockQuery.mockResolvedValue({ rows: [{ id: 20, ...data }] });
      const result = await repo.create(data);
      expect(result.cargo).toBe('Dev');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cargos_salarios'),
        expect.any(Array),
      );
    });
  });
});
