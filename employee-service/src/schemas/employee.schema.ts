import { z } from 'zod';

const tipoDocumentoEnum = z.enum([
  'cedula_ciudadania', 'cedula_extranjeria', 'pasaporte', 'tarjeta_identidad',
]);

const generoEnum = z.enum(['masculino', 'femenino', 'otro', 'prefiero_no_decir']);

const estadoEmpleadoEnum = z.enum(['activo', 'inactivo', 'vacaciones', 'licencia', 'retirado']);

const nivelEducativoEnum = z.enum([
  'bachiller', 'tecnico', 'tecnologo', 'universitario', 'posgrado',
  'especialista', 'magister', 'doctorado',
]);

const tipoSalarioEnum = z.enum(['fijo', 'variable', 'por_hora']);

export const createEmpleadoSchema = z.object({
  cedula:             z.string().min(1).max(20).optional(),
  tipo_documento:     tipoDocumentoEnum.optional(),
  nombre:             z.string().min(1, { message: 'El nombre es requerido' }).max(100),
  apellido:           z.string().min(1, { message: 'El apellido es requerido' }).max(100),
  genero:             generoEnum.optional(),
  fecha_nacimiento:   z.string().optional(),
  celular:            z.string()
                       .min(10, { message: 'El celular debe tener al menos 10 dígitos' })
                       .max(20)
                       .optional(),
  telefono_fijo:      z.string().max(20).optional(),
  correo_personal:    z.string().email({ message: 'Correo personal inválido' }).optional(),
  correo_corporativo: z.string().email({ message: 'Correo corporativo inválido' }),
  direccion:          z.string().max(255).optional(),
  ciudad:             z.string().max(100).optional(),
  departamento:       z.string().max(100).optional(),
  nivel_educativo:    nivelEducativoEnum.optional(),
  fecha_ingreso:      z.string().optional(),
  // Cargo inicial (opcional — se crea solo si ambos están presentes)
  cargo:              z.string().max(100).optional(),
  cargo_departamento: z.string().max(100).optional(),
  salario:            z.number()
                       .positive()
                       .max(100_000_000, { message: 'El salario no puede superar 100.000.000 COP' })
                       .optional(),
  tipo_salario:       tipoSalarioEnum.optional(),
});

export const updateEmpleadoSchema = z.object({
  nombre:             z.string().min(1).max(100).optional(),
  apellido:           z.string().min(1).max(100).optional(),
  cedula:             z.string().min(1).max(20).optional(),
  tipo_documento:     tipoDocumentoEnum.optional(),
  genero:             generoEnum.optional(),
  fecha_nacimiento:   z.string().optional(),
  celular:            z.string()
                       .min(10, { message: 'El celular debe tener al menos 10 dígitos' })
                       .max(20)
                       .optional(),
  telefono_fijo:      z.string().max(20).optional(),
  correo_personal:    z.string().email({ message: 'Correo personal inválido' }).optional(),
  correo_corporativo: z.string().email({ message: 'Correo corporativo inválido' }).optional(),
  direccion:          z.string().max(255).optional(),
  ciudad:             z.string().max(100).optional(),
  departamento:       z.string().max(100).optional(),
  nivel_educativo:    nivelEducativoEnum.optional(),
  fecha_ingreso:      z.string().optional(),
  fecha_retiro:       z.string().optional(),
  estado:             estadoEmpleadoEnum.optional(),
});

export const createCargoSchema = z.object({
  cargo:         z.string().min(1, { message: 'El cargo es requerido' }).max(100),
  departamento:  z.string().max(100).optional(),
  salario:       z.number()
                  .positive()
                  .max(100_000_000, { message: 'El salario no puede superar 100.000.000 COP' }),
  tipo_salario:  tipoSalarioEnum.optional(),
  fecha_inicio:  z.string().min(1, { message: 'La fecha de inicio es requerida' }),
  motivo_cambio: z.string().max(255).optional(),
});

export type CreateEmpleadoInput = z.infer<typeof createEmpleadoSchema>;
export type UpdateEmpleadoInput = z.infer<typeof updateEmpleadoSchema>;
export type CreateCargoInput    = z.infer<typeof createCargoSchema>;
