import { EmployeeService } from '../../../src/services/employee.service';
import { IEmployeeRepository } from '../../../src/repositories/interfaces/employee.repository.interface';
import { ICargoSalarioRepository } from '../../../src/repositories/interfaces/cargo-salario.repository.interface';
import { IDocumentoRepository } from '../../../src/repositories/interfaces/documento.repository.interface';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { ConflictError } from '../../../src/shared/errors/conflict.error';
import { Empleado, CargoSalario, DocumentoEmpleado } from '../../../src/entities/employee.entity';
import { AuthenticatedUser } from '../../../src/types/authenticated-user.type';
import { IContractServiceClient } from '../../../src/clients/contractServiceClient';

// ─── Fixtures ─────────────────────────────────────────────────────────────

const mockEmpleado: Empleado = {
  id: 1, cedula: '123456789', tipo_documento: 'cedula_ciudadania',
  nombre: 'Juan', apellido: 'García', genero: null,
  fecha_nacimiento: null, celular: null, telefono_fijo: null,
  correo_personal: null, correo_corporativo: 'juan@empresa.com',
  direccion: null, ciudad: null, departamento: null,
  nivel_educativo: null, estado: 'activo', razon_estado: null,
  fecha_ingreso: null, fecha_retiro: null,
  created_at: new Date(), updated_at: new Date(),
};

const mockCargo: CargoSalario = {
  id: 1, empleado_id: 1, cargo: 'Dev', departamento: null,
  salario: 5000000, tipo_salario: 'fijo',
  fecha_inicio: new Date(), fecha_fin: null,
  activo: true, motivo_cambio: null,
  registrado_por: 'admin@empresa.com', created_at: new Date(),
};

const mockDoc: DocumentoEmpleado = {
  id: 1, empleado_id: 1, tipo: 'foto', nombre_archivo: 'foto.jpg',
  s3_key: 'fotos/1.jpg', s3_url: 'https://s3...', mime_type: 'image/jpeg',
  tamano_bytes: null, activo: true, subido_por: 'admin@empresa.com',
  aprobado_por: null, fecha_aprobacion: null,
  created_at: new Date(),
};

const actor: AuthenticatedUser = { id: '1', email: 'admin@empresa.com', rol: 'ADMIN' };

// ─── Setup ────────────────────────────────────────────────────────────────

describe('EmployeeService', () => {
  let service: EmployeeService;
  let empRepo: jest.Mocked<IEmployeeRepository>;
  let cargoRepo: jest.Mocked<ICargoSalarioRepository>;
  let docRepo: jest.Mocked<IDocumentoRepository>;
  let mockUrlSubida: jest.Mock;
  let mockUrlDescarga: jest.Mock;
  let mockRegistrar: jest.Mock;
  let mockNotificar: jest.Mock;
  let contractClient: jest.Mocked<IContractServiceClient>;

  beforeEach(() => {
    empRepo = {
      findAll:                  jest.fn(),
      count:                    jest.fn(),
      findById:                 jest.fn(),
      findByCedula:             jest.fn(),
      findByCorreoCorporativo:  jest.fn(),
      findByAnyEmail:           jest.fn(),
      create:                   jest.fn(),
      update:                   jest.fn(),
      updateEstadoByCorreo:     jest.fn(),
      softDelete:               jest.fn(),
    };
    cargoRepo = {
      findActivo:   jest.fn(),
      findAll:      jest.fn(),
      cerrarActivo: jest.fn(),
      create:       jest.fn(),
    };
    docRepo = {
      findAll:            jest.fn(),
      findById:           jest.fn(),
      desactivarPorTipo:  jest.fn(),
      create:             jest.fn(),
      approve:            jest.fn(),
    };
    mockUrlSubida  = jest.fn().mockResolvedValue({ url: 'https://s3.presigned', key: 'fotos/1.jpg' });
    mockUrlDescarga = jest.fn().mockResolvedValue('https://s3.download');
    mockRegistrar  = jest.fn();
    mockNotificar = jest.fn();
    contractClient = {
      getActiveContractForEmployee: jest.fn(),
    };

    service = new EmployeeService(empRepo, cargoRepo, docRepo, mockUrlSubida, mockUrlDescarga, mockRegistrar, mockNotificar, contractClient);
  });

  // ─── getAll ─────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns paginated result with correct offset', async () => {
      empRepo.findAll.mockResolvedValue([mockEmpleado]);
      empRepo.count.mockResolvedValue(1);
      const result = await service.getAll(2, 10);
      expect(empRepo.findAll).toHaveBeenCalledWith(10, 10, undefined); // offset = (2-1)*10
      expect(empRepo.count).toHaveBeenCalledWith(undefined);
      expect(result).toEqual({ empleados: [mockEmpleado], total: 1, page: 2, limit: 10 });
    });

    it('passes filters to repository and count', async () => {
      const filters = { search: 'juan', estado: 'activo' };
      empRepo.findAll.mockResolvedValue([mockEmpleado]);
      empRepo.count.mockResolvedValue(1);

      await service.getAll(1, 20, filters);

      expect(empRepo.findAll).toHaveBeenCalledWith(20, 0, filters);
      expect(empRepo.count).toHaveBeenCalledWith(filters);
    });
  });

  // ─── getById ────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns employee when found', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      expect(await service.getById(1)).toEqual(mockEmpleado);
    });

    it('throws NotFoundError when not found', async () => {
      empRepo.findById.mockResolvedValue(null);
      await expect(service.getById(999)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    const baseDto = { nombre: 'Juan', apellido: 'García', correo_corporativo: 'juan@empresa.com' };

    it('creates employee without optional fields', async () => {
      empRepo.findByCorreoCorporativo.mockResolvedValue(null);
      empRepo.create.mockResolvedValue(mockEmpleado);
      const result = await service.create(baseDto, actor);
      expect(result).toEqual(mockEmpleado);
      expect(cargoRepo.create).not.toHaveBeenCalled();
      expect(mockRegistrar).toHaveBeenCalledWith(expect.objectContaining({ campo_modificado: 'creacion' }));
    });

    it('skips cedula duplicate check when cedula is not provided', async () => {
      empRepo.findByCorreoCorporativo.mockResolvedValue(null);
      empRepo.create.mockResolvedValue(mockEmpleado);
      await service.create(baseDto, actor);
      expect(empRepo.findByCedula).not.toHaveBeenCalled();
    });

    it('creates initial cargo when cargo and salario are provided', async () => {
      const dto = { ...baseDto, cedula: '111', cargo: 'Dev', salario: 5000000 };
      empRepo.findByCedula.mockResolvedValue(null);
      empRepo.findByCorreoCorporativo.mockResolvedValue(null);
      empRepo.create.mockResolvedValue(mockEmpleado);
      cargoRepo.create.mockResolvedValue(mockCargo);
      await service.create(dto, actor);
      expect(cargoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ cargo: 'Dev', salario: 5000000 }));
    });

    it('uses fecha_ingreso as fecha_inicio for initial cargo', async () => {
      const dto = { ...baseDto, cargo: 'Dev', salario: 5000000, fecha_ingreso: '2024-01-01' };
      empRepo.findByCorreoCorporativo.mockResolvedValue(null);
      empRepo.create.mockResolvedValue(mockEmpleado);
      cargoRepo.create.mockResolvedValue(mockCargo);
      await service.create(dto, actor);
      expect(cargoRepo.create).toHaveBeenCalledWith(expect.objectContaining({ fecha_inicio: '2024-01-01' }));
    });

    it('throws ConflictError when cedula is already in use', async () => {
      empRepo.findByCedula.mockResolvedValue(mockEmpleado);
      empRepo.findByCorreoCorporativo.mockResolvedValue(null);
      await expect(service.create({ ...baseDto, cedula: '123' }, actor)).rejects.toThrow(ConflictError);
    });

    it('throws ConflictError when correo_corporativo is already in use', async () => {
      empRepo.findByCorreoCorporativo.mockResolvedValue(mockEmpleado);
      await expect(service.create(baseDto, actor)).rejects.toThrow(ConflictError);
    });

    it('passes all optional personal fields to repository', async () => {
      const dto = {
        ...baseDto, cedula: '111', genero: 'masculino' as const,
        celular: '3001234567', ciudad: 'Bogotá', departamento: 'TI',
        nivel_educativo: 'universitario' as const, fecha_ingreso: '2024-01-01',
        correo_personal: 'j@g.com', telefono_fijo: '6012345', direccion: 'Calle 1',
        fecha_nacimiento: '1990-01-01',
      };
      empRepo.findByCedula.mockResolvedValue(null);
      empRepo.findByCorreoCorporativo.mockResolvedValue(null);
      empRepo.create.mockResolvedValue(mockEmpleado);
      await service.create(dto, actor);
      expect(empRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        genero: 'masculino', celular: '3001234567', ciudad: 'Bogotá',
      }));
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates allowed fields and calls registrar', async () => {
      const updated = { ...mockEmpleado, celular: '3009999999' };
      empRepo.findById.mockResolvedValue(mockEmpleado);
      empRepo.update.mockResolvedValue(updated);
      const result = await service.update(1, { celular: '3009999999' }, actor);
      expect(result.celular).toBe('3009999999');
      expect(mockRegistrar).toHaveBeenCalled();
    });

    it('throws NotFoundError when employee does not exist', async () => {
      empRepo.findById.mockResolvedValue(null);
      await expect(service.update(999, {}, actor)).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when update returns null', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      empRepo.update.mockResolvedValue(null);
      await expect(service.update(1, { nombre: 'X' }, actor)).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when new cedula is already taken by another employee', async () => {
      const otro = { ...mockEmpleado, id: 2, cedula: '999999999' };
      empRepo.findById.mockResolvedValue(mockEmpleado);
      empRepo.findByCedula.mockResolvedValue(otro);
      await expect(service.update(1, { cedula: '999999999' }, actor)).rejects.toThrow(ConflictError);
    });

    it('does not check cedula conflict when value is unchanged', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      empRepo.update.mockResolvedValue(mockEmpleado);
      await service.update(1, { cedula: '123456789' }, actor); // same cedula
      expect(empRepo.findByCedula).not.toHaveBeenCalled();
    });

    it('throws ConflictError when new correo is already taken', async () => {
      const otro = { ...mockEmpleado, id: 2, correo_corporativo: 'otro@empresa.com' };
      empRepo.findById.mockResolvedValue(mockEmpleado);
      empRepo.findByCedula.mockResolvedValue(null);
      empRepo.findByCorreoCorporativo.mockResolvedValue(otro);
      await expect(service.update(1, { correo_corporativo: 'otro@empresa.com' }, actor)).rejects.toThrow(ConflictError);
    });

    it('does not check correo conflict when value is unchanged', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      empRepo.update.mockResolvedValue(mockEmpleado);
      await service.update(1, { correo_corporativo: 'juan@empresa.com' }, actor);
      expect(empRepo.findByCorreoCorporativo).not.toHaveBeenCalled();
    });
  });

  // ─── softDelete ─────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('marks employee as retirado', async () => {
      const deleted = { ...mockEmpleado, estado: 'retirado' as const };
      empRepo.findById.mockResolvedValue(mockEmpleado);
      empRepo.softDelete.mockResolvedValue(deleted);
      const result = await service.softDelete(1, actor);
      expect(result.estado).toBe('retirado');
      expect(mockRegistrar).toHaveBeenCalledWith(expect.objectContaining({ valor_nuevo: 'retirado' }));
    });

    it('throws NotFoundError when employee does not exist', async () => {
      empRepo.findById.mockResolvedValue(null);
      await expect(service.softDelete(999, actor)).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when softDelete returns null', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      empRepo.softDelete.mockResolvedValue(null);
      await expect(service.softDelete(1, actor)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── Cargos ─────────────────────────────────────────────────────────────

  describe('getCargoActual', () => {
    it('returns the active cargo', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      cargoRepo.findActivo.mockResolvedValue(mockCargo);
      expect(await service.getCargoActual(1)).toEqual(mockCargo);
    });

    it('returns null when no active cargo', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      cargoRepo.findActivo.mockResolvedValue(null);
      expect(await service.getCargoActual(1)).toBeNull();
    });

    it('throws NotFoundError when employee not found', async () => {
      empRepo.findById.mockResolvedValue(null);
      await expect(service.getCargoActual(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getHistorialCargos', () => {
    it('returns cargo history', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      cargoRepo.findAll.mockResolvedValue([mockCargo]);
      expect(await service.getHistorialCargos(1)).toEqual([mockCargo]);
    });

    it('throws NotFoundError when employee not found', async () => {
      empRepo.findById.mockResolvedValue(null);
      await expect(service.getHistorialCargos(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getContratoLaboralActivo', () => {
    it('validates employee locally and returns active contract from contract-service', async () => {
      const activeContract = {
        contract: { id: 10, status: 'activo' },
        document: { key: 'contratos/10.pdf', url: 'https://signed.url', expiresIn: 3600 },
      };
      empRepo.findById.mockResolvedValue(mockEmpleado);
      contractClient.getActiveContractForEmployee.mockResolvedValue(activeContract);

      const result = await service.getContratoLaboralActivo(1, 'Bearer token');

      expect(result).toBe(activeContract);
      expect(contractClient.getActiveContractForEmployee).toHaveBeenCalledWith(1, 'Bearer token');
    });
  });

  describe('crearCargo', () => {
    const cargoDto = { cargo: 'Tech Lead', salario: 8000000, fecha_inicio: '2025-01-01' };
    const nuevoCargo = { ...mockCargo, id: 2, cargo: 'Tech Lead', salario: 8000000 };

    it('closes previous cargo and creates new one', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      cargoRepo.findActivo.mockResolvedValue(mockCargo);
      cargoRepo.cerrarActivo.mockResolvedValue();
      cargoRepo.create.mockResolvedValue(nuevoCargo);
      const result = await service.crearCargo(1, cargoDto, actor);
      expect(cargoRepo.cerrarActivo).toHaveBeenCalledWith(1);
      expect(result.cargo).toBe('Tech Lead');
      expect(mockRegistrar).toHaveBeenCalledWith(expect.objectContaining({
        valor_anterior: `${mockCargo.cargo} / ${mockCargo.salario}`,
      }));
    });

    it('creates first cargo when there is no previous one', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      cargoRepo.findActivo.mockResolvedValue(null);
      cargoRepo.cerrarActivo.mockResolvedValue();
      cargoRepo.create.mockResolvedValue(nuevoCargo);
      const result = await service.crearCargo(1, cargoDto, actor);
      expect(result).toEqual(nuevoCargo);
      expect(mockRegistrar).toHaveBeenCalledWith(expect.objectContaining({ valor_anterior: undefined }));
    });

    it('throws NotFoundError when employee not found', async () => {
      empRepo.findById.mockResolvedValue(null);
      await expect(service.crearCargo(999, cargoDto, actor)).rejects.toThrow(NotFoundError);
    });
  });

  // ─── Documentos ─────────────────────────────────────────────────────────

  describe('getDocumentos', () => {
    it('returns employee documents', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      docRepo.findAll.mockResolvedValue([mockDoc]);
      expect(await service.getDocumentos(1)).toEqual([mockDoc]);
    });

    it('throws NotFoundError when employee not found', async () => {
      empRepo.findById.mockResolvedValue(null);
      await expect(service.getDocumentos(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('generarPresignedUrl', () => {
    it('returns url and key from S3 helper', async () => {
      const result = await service.generarPresignedUrl({ empleado_id: 1, tipo: 'foto', contentType: 'image/jpeg' });
      expect(result).toEqual({ url: 'https://s3.presigned', key: 'fotos/1.jpg' });
      expect(mockUrlSubida).toHaveBeenCalledWith(1, 'foto', 'image/jpeg');
    });
  });

  describe('confirmarDocumento', () => {
    const docDto = { tipo: 'foto', s3_key: 'fotos/1.jpg', s3_url: 'https://s3...' };

    it('creates a pending document without deactivating the active document', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      docRepo.desactivarPorTipo.mockResolvedValue();
      docRepo.create.mockResolvedValue(mockDoc);
      const result = await service.confirmarDocumento(1, docDto, actor);
      expect(docRepo.desactivarPorTipo).not.toHaveBeenCalled();
      expect(docRepo.create).toHaveBeenCalledWith(expect.objectContaining({ activo: false }));
      expect(result).toEqual(mockDoc);
    });

    it('passes optional fields correctly', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);
      docRepo.desactivarPorTipo.mockResolvedValue();
      docRepo.create.mockResolvedValue(mockDoc);
      await service.confirmarDocumento(1, { ...docDto, mime_type: 'image/jpeg', tamano_bytes: 12345, nombre_archivo: 'foto.jpg' }, actor);
      expect(docRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        mime_type: 'image/jpeg', tamano_bytes: 12345, nombre_archivo: 'foto.jpg',
      }));
    });

    it('throws NotFoundError when employee not found', async () => {
      empRepo.findById.mockResolvedValue(null);
      await expect(service.confirmarDocumento(999, docDto, actor)).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when mime type is not allowed', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);

      await expect(
        service.confirmarDocumento(1, { ...docDto, mime_type: 'text/plain' }, actor),
      ).rejects.toThrow(ConflictError);

      expect(docRepo.create).not.toHaveBeenCalled();
    });

    it('throws ConflictError when file size exceeds the limit', async () => {
      empRepo.findById.mockResolvedValue(mockEmpleado);

      await expect(
        service.confirmarDocumento(1, { ...docDto, tamano_bytes: 6 * 1024 * 1024 }, actor),
      ).rejects.toThrow(ConflictError);

      expect(docRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('generarUrlDescargaDocumento', () => {
    it('returns signed download url with expiry', async () => {
      docRepo.findById.mockResolvedValue(mockDoc);
      const result = await service.generarUrlDescargaDocumento(1);
      expect(result).toEqual({ url: 'https://s3.download', expires_in: 3600 });
      expect(mockUrlDescarga).toHaveBeenCalledWith('fotos/1.jpg');
    });

    it('throws NotFoundError when document not found', async () => {
      docRepo.findById.mockResolvedValue(null);
      await expect(service.generarUrlDescargaDocumento(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('aprobarDocumento', () => {
    it('approves document and deactivates previous active documents of the same type', async () => {
      const approvedDoc = { ...mockDoc, activo: true, aprobado_por: actor.email };
      docRepo.findById.mockResolvedValue(mockDoc);
      docRepo.desactivarPorTipo.mockResolvedValue();
      docRepo.approve.mockResolvedValue(approvedDoc);

      const result = await service.aprobarDocumento(1, actor);

      expect(result).toEqual(approvedDoc);
      expect(docRepo.desactivarPorTipo).toHaveBeenCalledWith(mockDoc.empleado_id, mockDoc.tipo);
      expect(docRepo.approve).toHaveBeenCalledWith(1, actor.email);
      expect(mockRegistrar).toHaveBeenCalledWith(expect.objectContaining({
        entidad: 'documento',
        campo_modificado: 'aprobacion',
      }));
    });

    it('throws NotFoundError when document does not exist', async () => {
      docRepo.findById.mockResolvedValue(null);

      await expect(service.aprobarDocumento(999, actor)).rejects.toThrow(NotFoundError);
    });

    it('throws when repository cannot approve the document', async () => {
      docRepo.findById.mockResolvedValue(mockDoc);
      docRepo.desactivarPorTipo.mockResolvedValue();
      docRepo.approve.mockResolvedValue(null);

      await expect(service.aprobarDocumento(1, actor)).rejects.toThrow('No se pudo aprobar el documento 1');
    });
  });

  describe('exportCsv', () => {
    it('returns only headers when no employees exist', async () => {
      empRepo.findAll.mockResolvedValue([]);
      const csv = await service.exportCsv();
      expect(csv).toContain('ID');
      expect(csv).toContain('Cédula');
      expect(csv.split('\r\n')).toHaveLength(1);
    });

    it('returns headers and one row for a single employee', async () => {
      empRepo.findAll.mockResolvedValue([mockEmpleado]);
      const csv = await service.exportCsv();
      const lines = csv.split('\r\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toContain('ID');
      expect(lines[1]).toContain(String(mockEmpleado.id));
    });

    it('passes filters to repository findAll', async () => {
      empRepo.findAll.mockResolvedValue([]);
      await service.exportCsv({ search: 'juan', estado: 'activo', departamento: 'Sistemas' });
      expect(empRepo.findAll).toHaveBeenCalledWith(10000, 0, { search: 'juan', estado: 'activo', departamento: 'Sistemas' });
    });

    it('wraps values containing commas in double quotes', async () => {
      empRepo.findAll.mockResolvedValue([{ ...mockEmpleado, ciudad: 'Bogota, DC' }]);
      const csv = await service.exportCsv();
      expect(csv).toContain('"Bogota, DC"');
    });

    it('wraps values containing double quotes and escapes them', async () => {
      empRepo.findAll.mockResolvedValue([{ ...mockEmpleado, nombre: 'Juan "El Pro"' }]);
      const csv = await service.exportCsv();
      expect(csv).toContain('"Juan ""El Pro"""');
    });
  });
});
