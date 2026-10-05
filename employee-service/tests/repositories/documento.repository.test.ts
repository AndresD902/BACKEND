import { DocumentoRepository } from '../../src/repositories/documento.repository';
import { pool } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  pool: { query: jest.fn() },
}));

const mockQuery = pool.query as jest.Mock;

describe('DocumentoRepository', () => {
  let repo: DocumentoRepository;

  beforeEach(() => {
    repo = new DocumentoRepository();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all documents for an employee', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }, { id: 2 }] });
      const result = await repo.findAll(5);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('empleado_id'), [5]);
    });
  });

  describe('findById', () => {
    it('should return document when found', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 3, tipo: 'CV' }] });
      const result = await repo.findById(3);
      expect(result?.tipo).toBe('CV');
    });

    it('should return null when document is not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const result = await repo.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('desactivarPorTipo', () => {
    it('should update activo=FALSE for the given type and employee', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await repo.desactivarPorTipo(1, 'CV');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('activo = FALSE'),
        [1, 'CV'],
      );
    });
  });

  describe('create', () => {
    it('should insert a new document and return it', async () => {
      const data = { empleado_id: 1, tipo: 'FOTO', s3_key: 'photos/1.jpg' };
      mockQuery.mockResolvedValue({ rows: [{ id: 10, ...data }] });
      const result = await repo.create(data);
      expect(result.tipo).toBe('FOTO');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO documentos_empleado'),
        expect.any(Array),
      );
    });
  });
});
