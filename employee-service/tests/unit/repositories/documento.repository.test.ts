const mockQuery = jest.fn();
jest.mock('../../../src/config/database', () => ({ pool: { query: mockQuery } }));

import { DocumentoRepository } from '../../../src/repositories/documento.repository';
import { DocumentoEmpleado } from '../../../src/entities/employee.entity';

const baseDoc: DocumentoEmpleado = {
  id: 1, empleado_id: 1, tipo: 'foto',
  nombre_archivo: 'foto.jpg', s3_key: 'fotos/1.jpg',
  s3_url: 'https://s3...', mime_type: 'image/jpeg',
  tamano_bytes: null, activo: true,
  subido_por: 'admin@empresa.com', created_at: new Date(),
};

describe('DocumentoRepository', () => {
  let repo: DocumentoRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new DocumentoRepository();
  });

  describe('findAll', () => {
    it('returns documents for employee', async () => {
      mockQuery.mockResolvedValue({ rows: [baseDoc] });
      const result = await repo.findAll(1);
      expect(result).toEqual([baseDoc]);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE empleado_id = $1'),
        [1],
      );
    });
  });

  describe('findById', () => {
    it('returns document when found', async () => {
      mockQuery.mockResolvedValue({ rows: [baseDoc] });
      expect(await repo.findById(1)).toEqual(baseDoc);
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      expect(await repo.findById(999)).toBeNull();
    });
  });

  describe('desactivarPorTipo', () => {
    it('deactivates documents of given type', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await expect(repo.desactivarPorTipo(1, 'foto')).resolves.not.toThrow();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('activo = FALSE'),
        [1, 'foto'],
      );
    });
  });

  describe('create', () => {
    it('inserts document and returns new row', async () => {
      mockQuery.mockResolvedValue({ rows: [baseDoc] });
      const result = await repo.create({ empleado_id: 1, tipo: 'foto', s3_key: 'fotos/1.jpg' });
      expect(result).toEqual(baseDoc);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO documentos_empleado'),
        expect.any(Array),
      );
    });
  });
});
