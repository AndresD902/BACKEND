import { EmployeeRepository } from '../../src/repositories/employee.repository';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn() },
}));

const mockQuery = pool.query as jest.Mock;

describe('EmployeeRepository', () => {
  let repo: EmployeeRepository;

  beforeEach(() => {
    repo = new EmployeeRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all employees with limit and offset', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });
      const result = await repo.findAll(10, 0);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT'), [10, 0]);
    });
  });

  describe('count', () => {
    it('should return the total employee count as a number', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });
      const result = await repo.count();
      expect(result).toBe(42);
    });
  });

  describe('findById', () => {
    it('should return employee when found', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, cedula: '123' }] });
      const result = await repo.findById(1);
      expect(result).toEqual({ id: 1, cedula: '123' });
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repo.findById(99);
      expect(result).toBeNull();
    });
  });

  describe('findByCedula', () => {
    it('should return employee matching the cedula', async () => {
      mockQuery.mockResolvedValue({ rows: [{ cedula: '111' }] });
      const result = await repo.findByCedula('111');
      expect(result?.cedula).toBe('111');
    });

    it('should return null when cedula is not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repo.findByCedula('000');
      expect(result).toBeNull();
    });
  });

  describe('findByCorreoCorporativo', () => {
    it('should query with lowercase email and return employee', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 5 }] });
      const result = await repo.findByCorreoCorporativo('TEST@Corp.com');
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['test@corp.com']);
      expect(result).toEqual({ id: 5 });
    });

    it('should return null when email is not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repo.findByCorreoCorporativo('none@x.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should build and execute INSERT and return the new row', async () => {
      const data = { cedula: '999', nombre: 'Ana' };
      mockQuery.mockResolvedValue({ rows: [{ id: 10, ...data }] });
      const result = await repo.create(data);
      expect(result.cedula).toBe('999');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO empleados'),
        expect.arrayContaining(['999', 'Ana']),
      );
    });
  });

  describe('update', () => {
    it('should build and execute UPDATE and return updated row', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, nombre: 'Updated' }] });
      const result = await repo.update(1, { nombre: 'Updated' });
      expect(result?.nombre).toBe('Updated');
    });

    it('should return null when no rows are updated', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repo.update(99, { nombre: 'X' });
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should set estado=retirado and return updated row', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1, estado: 'retirado' }] });
      const result = await repo.softDelete(1);
      expect(result?.estado).toBe('retirado');
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("'retirado'"), [1]);
    });

    it('should return null when employee is not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repo.softDelete(99);
      expect(result).toBeNull();
    });
  });
});
