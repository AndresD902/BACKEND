export interface CreateEmpleadoDto {
  cedula?: string;
  tipo_documento?: string;
  nombre: string;
  apellido: string;
  genero?: string;
  fecha_nacimiento?: string;
  celular?: string;
  telefono_fijo?: string;
  correo_personal?: string;
  correo_corporativo: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  nivel_educativo?: string;
  fecha_ingreso?: string;
  // cargo inicial (opcional)
  cargo?: string;
  cargo_departamento?: string;
  salario?: number;
  tipo_salario?: string;
}
