const mockQuery = jest.fn();
jest.mock('../../../src/config/database', () => ({ pool: { query: mockQuery } }));

import { CargoSalarioRepository } from '../../../src/repositories/cargoSalario.repository';
import { CargoSalario } from '../../../src/entities/employee.entity';

const baseCargo: CargoSalario = {
  id: 1, empleado_id: 1, cargo: 'Dev', departamento: null,
  salario: 5000000, tipo_salario: 'fijo',
  fecha_inicio: new Date(), fecha_fin: null,
  activo: true, motivo_cambio: null,
  registrado_por: 'admin@empresa.com', created_at: new Date(),
};

describe('CargoSalarioRepository', () => {
  let repo: CargoSalarioRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new CargoSalarioRepository();
  });

  describe('findActivo', () => {
    it('returns active cargo when found', async () => {
      mockQuery.mockResolvedValue({ rows: [baseCargo] });
      expect(await repo.findActivo(1)).toEqual(baseCargo);
    });

    it('returns null when no active cargo', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      expect(await repo.findActivo(1)).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns all cargos for employee', async () => {
      mockQuery.mockResolvedValue({ rows: [baseCargo] });
      const result = await repo.findAll(1);
      expect(result).toEqual([baseCargo]);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE empleado_id = $1'), [1]);
    });
  });

  describe('cerrarActivo', () => {
    it('sets activo=false on active cargo', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await expect(repo.cerrarActivo(1)).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('activo = FALSE'),
        [1],
      );
    });
  });

  describe('create', () => {
    it('inserts cargo and returns new row', async () => {
      mockQuery.mockResolvedValue({ rows: [baseCargo] });
      const result = await repo.create({ empleado_id: 1, cargo: 'Dev', salario: 5000000 });
      expect(result).toEqual(baseCargo);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO cargos_salarios'),
        expect.any(Array),
      );
    });
  });
});
