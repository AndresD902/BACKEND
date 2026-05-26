import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/repositories/empresa.repository', () => ({
  empresaRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByNit: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateEstado: vi.fn(),
  },
}));

vi.mock('../../../src/repositories/adminEmpresa.repository', () => ({
  adminEmpresaRepository: {
    findByEmpresa: vi.fn(),
    create: vi.fn(),
    countByEmpresa: vi.fn(),
  },
}));

vi.mock('../../../src/clients/authClient', () => ({
  registrarUsuario: vi.fn(),
}));

vi.mock('../../../src/clients/employeeClient', () => ({
  getEmpleadosPorEmpresa: vi.fn(),
}));

vi.mock('../../../src/services/email.service', () => ({
  emailService: { enviarCredencialesAdmin: vi.fn() },
}));

vi.mock('../../../src/utils/crypto.util', () => ({
  randomTempPassword: vi.fn().mockReturnValue('tempPass9a3f'),
  randomToken: vi.fn(),
  sha256: vi.fn(),
}));

import { empresaRepository } from '../../../src/repositories/empresa.repository';
import { adminEmpresaRepository } from '../../../src/repositories/adminEmpresa.repository';
import { registrarUsuario } from '../../../src/clients/authClient';
import { getEmpleadosPorEmpresa } from '../../../src/clients/employeeClient';
import { emailService } from '../../../src/services/email.service';
import { empresaService } from '../../../src/services/empresa.service';
import { ConflictError } from '../../../src/shared/errors/conflict.error';
import { NotFoundError } from '../../../src/shared/errors/not-found.error';
import { AppError } from '../../../src/shared/errors/app-error';
import { EstadoEmpresa } from '../../../src/shared/enums/estado-empresa.enum';

const mockEmpresaRepo = vi.mocked(empresaRepository);
const mockAdminEmpresaRepo = vi.mocked(adminEmpresaRepository);
const mockRegistrarUsuario = vi.mocked(registrarUsuario);
const mockGetEmpleadosPorEmpresa = vi.mocked(getEmpleadosPorEmpresa);
const mockEmailService = vi.mocked(emailService);

const FAKE_EMPRESA = {
  id: 1,
  nombre: 'Empresa Tech SAS',
  nit: '900123456-7',
  correo: 'empresa@tech.com',
  telefono: '3001234567',
  plan: 'basico',
  estado: 'activa',
};

const FAKE_ADMIN_EMPRESA = {
  id: 1,
  empresa_id: 1,
  nombre: 'Administrador 1 — Empresa Tech SAS',
  email: 'admin1.9001234567@tech.com',
  activo: true,
};

describe('empresaService.listar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna empresas con sus admins y datos de paginación', async () => {
    mockEmpresaRepo.findAll.mockResolvedValue({ empresas: [FAKE_EMPRESA], total: 1 });
    mockAdminEmpresaRepo.findByEmpresa.mockResolvedValue([FAKE_ADMIN_EMPRESA]);

    const result = await empresaService.listar(1, 20);

    expect(result.empresas).toHaveLength(1);
    expect(result.empresas[0]).toMatchObject({ ...FAKE_EMPRESA, admins: [FAKE_ADMIN_EMPRESA] });
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('usa valores por defecto de paginación', async () => {
    mockEmpresaRepo.findAll.mockResolvedValue({ empresas: [], total: 0 });

    await empresaService.listar();

    expect(mockEmpresaRepo.findAll).toHaveBeenCalledWith(1, 20);
  });
});

describe('empresaService.obtenerPorId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna empresa con sus admins', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(FAKE_EMPRESA);
    mockAdminEmpresaRepo.findByEmpresa.mockResolvedValue([FAKE_ADMIN_EMPRESA]);

    const result = await empresaService.obtenerPorId(1);

    expect(result).toMatchObject({ ...FAKE_EMPRESA, admins: [FAKE_ADMIN_EMPRESA] });
  });

  it('lanza NotFoundError si la empresa no existe', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(null);

    await expect(empresaService.obtenerPorId(99)).rejects.toThrow(NotFoundError);
  });
});

describe('empresaService.crear', () => {
  beforeEach(() => vi.clearAllMocks());

  it('crea la empresa y los 2 admins automáticamente', async () => {
    mockEmpresaRepo.findByNit.mockResolvedValue(null);
    mockEmpresaRepo.create.mockResolvedValue(FAKE_EMPRESA);
    mockRegistrarUsuario.mockResolvedValue({ id: 'auth-user-1' });
    mockAdminEmpresaRepo.create.mockResolvedValue(FAKE_ADMIN_EMPRESA);
    mockEmailService.enviarCredencialesAdmin.mockResolvedValue(undefined);

    const result = await empresaService.crear({
      nombre: 'Empresa Tech SAS',
      nit: '900123456-7',
      correo: 'empresa@tech.com',
      plan: 'basico',
    });

    expect(result.empresa).toEqual(FAKE_EMPRESA);
    expect(result.admins).toHaveLength(2);
    expect(mockRegistrarUsuario).toHaveBeenCalledTimes(2);
    expect(mockEmailService.enviarCredencialesAdmin).toHaveBeenCalledTimes(2);
  });

  it('lanza ConflictError si ya existe una empresa con ese NIT', async () => {
    mockEmpresaRepo.findByNit.mockResolvedValue(FAKE_EMPRESA);

    await expect(
      empresaService.crear({ nombre: 'Otra', nit: '900123456-7', correo: 'a@b.com', plan: 'basico' }),
    ).rejects.toThrow(ConflictError);

    expect(mockEmpresaRepo.create).not.toHaveBeenCalled();
  });

  it('continúa si la creación de un admin falla (registra advertencia)', async () => {
    mockEmpresaRepo.findByNit.mockResolvedValue(null);
    mockEmpresaRepo.create.mockResolvedValue(FAKE_EMPRESA);
    mockRegistrarUsuario.mockRejectedValue(new Error('Auth service down'));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await empresaService.crear({
      nombre: 'Empresa Tech SAS',
      nit: '900123456-7',
      correo: 'empresa@tech.com',
      plan: 'basico',
    });

    expect(result.empresa).toEqual(FAKE_EMPRESA);
    expect(result.admins).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledTimes(2);
    warnSpy.mockRestore();
  });
});

describe('empresaService.actualizar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('actualiza y retorna la empresa actualizada', async () => {
    const updated = { ...FAKE_EMPRESA, nombre: 'Empresa Tech SAS v2' };
    mockEmpresaRepo.findById.mockResolvedValue(FAKE_EMPRESA);
    mockEmpresaRepo.update.mockResolvedValue(updated);

    const result = await empresaService.actualizar(1, { nombre: 'Empresa Tech SAS v2' });

    expect(result).toEqual(updated);
    expect(mockEmpresaRepo.update).toHaveBeenCalledWith(1, { nombre: 'Empresa Tech SAS v2' });
  });

  it('lanza NotFoundError si la empresa no existe', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(null);

    await expect(empresaService.actualizar(99, { nombre: 'Test' })).rejects.toThrow(NotFoundError);
  });
});

describe('empresaService.actualizarEstado', () => {
  beforeEach(() => vi.clearAllMocks());

  it('actualiza el estado de la empresa', async () => {
    const updated = { ...FAKE_EMPRESA, estado: 'inactiva' };
    mockEmpresaRepo.findById.mockResolvedValue(FAKE_EMPRESA);
    mockEmpresaRepo.updateEstado.mockResolvedValue(updated);

    const result = await empresaService.actualizarEstado(1, EstadoEmpresa.INACTIVA);

    expect(result).toEqual(updated);
    expect(mockEmpresaRepo.updateEstado).toHaveBeenCalledWith(1, EstadoEmpresa.INACTIVA);
  });

  it('lanza NotFoundError si la empresa no existe', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(null);

    await expect(
      empresaService.actualizarEstado(99, EstadoEmpresa.SUSPENDIDA),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('empresaService.agregarAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('agrega un admin y envía credenciales por correo', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(FAKE_EMPRESA);
    mockAdminEmpresaRepo.countByEmpresa.mockResolvedValue(1);
    mockRegistrarUsuario.mockResolvedValue({ id: 'auth-user-new' });
    mockAdminEmpresaRepo.create.mockResolvedValue(FAKE_ADMIN_EMPRESA);
    mockEmailService.enviarCredencialesAdmin.mockResolvedValue(undefined);

    const result = await empresaService.agregarAdmin(1, {
      nombre: 'Admin Nuevo',
      email: 'adminnuevo@empresa.com',
    });

    expect(result).toEqual(FAKE_ADMIN_EMPRESA);
    expect(mockRegistrarUsuario).toHaveBeenCalledOnce();
    expect(mockEmailService.enviarCredencialesAdmin).toHaveBeenCalledOnce();
  });

  it('lanza NotFoundError si la empresa no existe', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(null);

    await expect(
      empresaService.agregarAdmin(99, { nombre: 'Admin', email: 'a@b.com' }),
    ).rejects.toThrow(NotFoundError);
  });

  it('lanza AppError 409 si ya hay 2 admins activos', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(FAKE_EMPRESA);
    mockAdminEmpresaRepo.countByEmpresa.mockResolvedValue(2);

    await expect(
      empresaService.agregarAdmin(1, { nombre: 'Tercero', email: 'tercero@empresa.com' }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'MAX_ADMINS_REACHED' });

    expect(mockRegistrarUsuario).not.toHaveBeenCalled();
  });
});

describe('empresaService.listarEmpleados', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna empleados con detalle_estado para cada estado posible', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(FAKE_EMPRESA);
    mockGetEmpleadosPorEmpresa.mockResolvedValue([
      { id: 1, nombre: 'Juan', estado: 'activo' },
      { id: 2, nombre: 'Ana', estado: 'retirado' },
      { id: 3, nombre: 'Luis', estado: 'inactivo', razon_estado: '' },
      { id: 4, nombre: 'María', estado: 'inactivo', razon_estado: 'Incapacidad médica' },
      { id: 5, nombre: 'Pedro', estado: 'transicion' },
      { id: 6, nombre: 'Rosa', estado: 'desconocido' },
    ]);

    const result = await empresaService.listarEmpleados(1);

    const porId = Object.fromEntries(result.map((e) => [e['id'], e]));
    expect(porId[1]['detalle_estado']).toBe('Trabajando actualmente');
    expect(porId[2]['detalle_estado']).toBe('Ya no forma parte de la empresa');
    expect(porId[3]['detalle_estado']).toBe('Ausentismo temporal');
    expect(porId[4]['detalle_estado']).toBe('Incapacidad médica');
    expect(porId[5]['detalle_estado']).toBe('Contrato próximo a vencer, en proceso de renovación');
    expect(porId[6]['detalle_estado']).toBe('desconocido');
  });

  it('retorna lista vacía y registra advertencia si el employee service falla', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(FAKE_EMPRESA);
    mockGetEmpleadosPorEmpresa.mockRejectedValue(new Error('Employee service unreachable'));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await empresaService.listarEmpleados(1);

    expect(result).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EmpresaService]'),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });

  it('lanza NotFoundError si la empresa no existe', async () => {
    mockEmpresaRepo.findById.mockResolvedValue(null);

    await expect(empresaService.listarEmpleados(99)).rejects.toThrow(NotFoundError);
  });
});
