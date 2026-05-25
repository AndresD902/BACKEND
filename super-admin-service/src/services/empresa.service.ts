import { empresaRepository } from '../repositories/empresa.repository';
import { adminEmpresaRepository } from '../repositories/adminEmpresa.repository';
import { registrarUsuario } from '../clients/authClient';
import { getEmpleados } from '../clients/employeeClient';
import { emailService } from './email.service';
import { randomTempPassword } from '../utils/crypto.util';
import { registrarAccion } from '../clients/historyClient';
import { ConflictError } from '../shared/errors/conflict.error';
import { NotFoundError } from '../shared/errors/not-found.error';
import { AppError } from '../shared/errors/app-error';
import { EstadoEmpresa } from '../shared/enums/estado-empresa.enum';

const ESTADO_LABELS: Record<string, string> = {
  activo:     'Trabajando actualmente',
  inactivo:   'Ausentismo temporal',
  transicion: 'Contrato próximo a vencer, en proceso de renovación',
  retirado:   'Ya no forma parte de la empresa',
};

export const empresaService = {
  async listar(page = 1, limit = 20) {
    const { empresas, total } = await empresaRepository.findAll(page, limit);

    const result = await Promise.all(
      empresas.map(async (e) => {
        const admins = await adminEmpresaRepository.findByEmpresa(e.id);
        return { ...e, admins };
      }),
    );

    return { empresas: result, total, page, limit };
  },

  async obtenerPorId(id: number) {
    const empresa = await empresaRepository.findById(id);
    if (!empresa) throw new NotFoundError('Empresa');
    const admins = await adminEmpresaRepository.findByEmpresa(id);
    return { ...empresa, admins };
  },

  async crear(data: {
    nombre:    string;
    nit:       string;
    correo:    string;
    telefono?: string;
    plan:      string;
    adminEmails?: string[];
  }) {
    const existente = await empresaRepository.findByNit(data.nit);
    if (existente) throw new ConflictError(`Ya existe una empresa con el NIT ${data.nit}`);

    const empresa = await empresaRepository.create(data);
    registrarAccion({
      usuario_email: 'super-admin-service',
      rol: 'SYSTEM',
      accion: 'creacion_empresa',
      entidad: 'empresa',
      entidad_id: empresa.id,
      detalle: JSON.stringify({
        nombre: empresa.nombre,
        nit: empresa.nit,
        correo: empresa.correo,
        plan: empresa.plan,
      }),
    });

    // Auto-create 2 admins and register them in the Auth Service
    const dominio  = data.correo.split('@')[1] ?? 'empresa.com';
    const adminsCreadados: Array<{ email: string; nombre: string }> = [];
    const adminEmails = data.adminEmails?.length === 2
      ? data.adminEmails
      : [1, 2].map((i) => `admin${i}.${data.nit.toLowerCase().replace(/\D/g, '')}@${dominio}`);

    for (let i = 1; i <= 2; i++) {
      const passwordTemporal = randomTempPassword();
      const adminEmail       = adminEmails[i - 1];
      const adminNombre      = `Administrador ${i} — ${data.nombre}`;

      try {
        await registrarUsuario({
          firstName: 'Administrador',
          lastName:  `${i} - ${data.nombre}`,
          email:     adminEmail,
          password:  passwordTemporal,
          role:      'ADMIN',
          companyId: empresa.id,
          emailVerified: true,
          mustChangePassword: true,
        });

        await adminEmpresaRepository.create({
          empresa_id: empresa.id,
          email:      adminEmail,
          nombre:     adminNombre,
        });

        await emailService.enviarCredencialesAdmin({
          to:               data.correo,
          adminEmail,
          passwordTemporal,
          nombreEmpresa:    data.nombre,
        });

        adminsCreadados.push({ email: adminEmail, nombre: adminNombre });
        registrarAccion({
          usuario_email: 'super-admin-service',
          rol: 'SYSTEM',
          accion: 'creacion_admin_empresa',
          entidad: 'empresa_admin',
          entidad_id: empresa.id,
          detalle: JSON.stringify({
            empresaId: empresa.id,
            adminEmail,
          }),
        });
      } catch (err) {
        console.warn(`[EmpresaService] No se pudo crear admin ${i} para empresa ${empresa.id}:`, (err as Error).message);
      }
    }

    return { empresa, admins: adminsCreadados };
  },

  async actualizar(id: number, data: {
    nombre?:   string;
    correo?:   string;
    telefono?: string;
    plan?:     string;
  }) {
    const empresa = await empresaRepository.findById(id);
    if (!empresa) throw new NotFoundError('Empresa');
    return empresaRepository.update(id, data);
  },

  async actualizarEstado(id: number, estado: EstadoEmpresa) {
    const empresa = await empresaRepository.findById(id);
    if (!empresa) throw new NotFoundError('Empresa');
    return empresaRepository.updateEstado(id, estado);
  },

  async agregarAdmin(empresaId: number, data: { nombre: string; email: string }) {
    const empresa = await empresaRepository.findById(empresaId);
    if (!empresa) throw new NotFoundError('Empresa');

    const total = await adminEmpresaRepository.countByEmpresa(empresaId);
    if (total >= 2) {
      throw new AppError(
        'La empresa ya tiene el máximo de 2 administradores activos. Desactiva uno antes de agregar otro.',
        409,
        'MAX_ADMINS_REACHED',
      );
    }

    const passwordTemporal = randomTempPassword();

    await registrarUsuario({
      firstName: 'Administrador',
      lastName:  data.nombre,
      email:     data.email,
      password:  passwordTemporal,
      role:      'ADMIN',
      companyId: empresaId,
      emailVerified: true,
      mustChangePassword: true,
    });

    const admin = await adminEmpresaRepository.create({
      empresa_id: empresaId,
      email:      data.email,
      nombre:     data.nombre,
    });

    await emailService.enviarCredencialesAdmin({
      to:               empresa.correo,
      adminEmail:       data.email,
      passwordTemporal,
      nombreEmpresa:    empresa.nombre,
    });

    return admin;
  },

  async listarEmpleados(empresaId: number, token: string) {
    const empresa = await empresaRepository.findById(empresaId);
    if (!empresa) throw new NotFoundError('Empresa');

    let empleados: Record<string, unknown>[] = [];
    try {
      empleados = await getEmpleados(token);
    } catch (err) {
      console.warn('[EmpresaService] No se pudo obtener empleados:', (err as Error).message);
    }

    return empleados.map((emp) => {
      let detalle_estado: string;
      switch (emp['estado']) {
        case 'activo':
          detalle_estado = 'Trabajando actualmente';
          break;
        case 'retirado':
          detalle_estado = 'Ya no forma parte de la empresa';
          break;
        case 'inactivo':
          const razon = emp['razon_estado'] as string | undefined;
          detalle_estado = razon && razon.trim() !== '' ? razon : 'Ausentismo temporal';
          break;
        case 'transicion':
          detalle_estado = 'Contrato próximo a vencer, en proceso de renovación';
          break;
        default:
          detalle_estado = String(emp['estado']);
      }
      return { ...emp, detalle_estado };
    });
  },
};
