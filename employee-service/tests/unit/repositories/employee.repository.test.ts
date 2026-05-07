const mockQuery = jest.fn();
jest.mock('../../../src/config/database', () => ({ pool: { query: mockQuery } }));

import { EmployeeRepository } from '../../../src/repositories/employee.repository';
import { Empleado } from '../../../src/entities/employee.entity';

const baseEmpleado: Empleado = {
  id: 1, cedula: '123', tipo_documento: 'cedula_ciudadania',
  nombre: 'Juan', apellido: 'García', genero: null,
  fecha_nacimiento: null, celular: null, telefono_fijo: null,
  correo_personal: null, correo_corporativo: 'juan@empresa.com',
  direccion: null, ciudad: null, departamento: null,
  nivel_educativo: null, estado: 'activo', razon_estado: null,
  fecha_ingreso: null, fecha_retiro: null,
  created_at: new Date(), updated_at: new Date(),
};

describe('EmployeeRepository', () => {
  let repo: EmployeeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new EmployeeRepository();
  });

  describe('findAll', () => {
    it('returns rows from query without filters', async () => {
      mockQuery.mockResolvedValue({ rows: [baseEmpleado] });
      const result = await repo.findAll(20, 0);
      expect(result).toEqual([baseEmpleado]);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT $1'), [20, 0]);
    });

    it('includes WHERE clause when estado filter is provided', async () => {
      mockQuery.mockResolvedValue({ rows: [baseEmpleado] });
      await repo.findAll(20, 0, { estado: 'activo' });
      const callArgs = mockQuery.mock.calls[0];
      expect(String(callArgs[0])).toContain('estado = $');
      expect(callArgs[1]).toContain('activo');
    });

    it('includes WHERE clause when departamento filter is provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repo.findAll(20, 0, { departamento: 'Sistemas' });
      const callArgs = mockQuery.mock.calls[0];
      expect(String(callArgs[0])).toContain('LOWER(departamento)');
      expect(callArgs[1]).toContain('Sistemas');
    });

    it('includes WHERE clause when search filter is provided', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repo.findAll(20, 0, { search: 'Juan' });
      const callArgs = mockQuery.mock.calls[0];
      expect(String(callArgs[0])).toContain('LOWER(nombre)');
      expect(callArgs[1]).toContain('%juan%');
    });
  });

  describe('count', () => {
    it('returns parsed integer count', async () => {
      mockQuery.mockResolvedValue({ rows: [{ count: '42' }] });
      expect(await repo.count()).toBe(42);
    });
  });

  describe('findById', () => {
    it('returns employee when row exists', async () => {
      mockQuery.mockResolvedValue({ rows: [baseEmpleado] });
      expect(await repo.findById(1)).toEqual(baseEmpleado);
    });

    it('returns null when no rows', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('findByCedula', () => {
    it('returns employee when found', async () => {
      mockQuery.mockResolvedValue({ rows: [baseEmpleado] });
      expect(await repo.findByCedula('123')).toEqual(baseEmpleado);
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      expect(await repo.findByCedula('000')).toBeNull();
    });
  });

  describe('findByCorreoCorporativo', () => {
    it('returns employee when found', async () => {
      mockQuery.mockResolvedValue({ rows: [baseEmpleado] });
      expect(await repo.findByCorreoCorporativo('juan@empresa.com')).toEqual(baseEmpleado);
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      expect(await repo.findByCorreoCorporativo('nobody@empresa.com')).toBeNull();
    });
  });

  describe('create', () => {
    it('builds dynamic INSERT and returns new row', async () => {
      mockQuery.mockResolvedValue({ rows: [baseEmpleado] });
      const result = await repo.create({ nombre: 'Juan', correo_corporativo: 'juan@empresa.com' });
      expect(result).toEqual(baseEmpleado);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO empleados'),
        expect.arrayContaining(['Juan', 'juan@empresa.com']),
      );
    });
  });

  describe('update', () => {
    it('builds dynamic UPDATE and returns updated row', async () => {
      const updated = { ...baseEmpleado, celular: '3001234567' };
      mockQuery.mockResolvedValue({ rows: [updated] });
      const result = await repo.update(1, { celular: '3001234567' });
      expect(result).toEqual(updated);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE empleados'),
        expect.arrayContaining(['3001234567', 1]),
      );
    });

    it('returns null when no row matched', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      expect(await repo.update(999, { nombre: 'Test' })).toBeNull();
    });
  });

  describe('updateEstadoByCorreo', () => {
    it('executes update without returning data', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await expect(repo.updateEstadoByCorreo('juan@empresa.com', 'inactivo')).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE empleados'),
        ['inactivo', 'juan@empresa.com'],
      );
    });
  });

  describe('findByAnyEmail', () => {
    it('returns employee when found by corporate email', async () => {
      mockQuery.mockResolvedValue({ rows: [baseEmpleado] });
      const result = await repo.findByAnyEmail('juan@empresa.com');
      expect(result).toEqual(baseEmpleado);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('correo_corporativo'), ['juan@empresa.com']);
    });

    it('returns null when no employee found by email', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repo.findByAnyEmail('nobody@empresa.com');
      expect(result).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('sets estado to retirado and returns row', async () => {
      const deleted = { ...baseEmpleado, estado: 'retirado' as const };
      mockQuery.mockResolvedValue({ rows: [deleted] });
      const result = await repo.softDelete(1);
      expect(result?.estado).toBe('retirado');
    });

    it('returns null when employee not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      expect(await repo.softDelete(999)).toBeNull();
    });
  });
});
