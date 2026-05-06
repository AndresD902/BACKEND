export interface UpdateEmpleadoDto {
  nombre?: string;
  apellido?: string;
  cedula?: string;
  tipo_documento?: string;
  genero?: string;
  fecha_nacimiento?: string;
  celular?: string;
  telefono_fijo?: string;
  correo_personal?: string;
  correo_corporativo?: string;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  nivel_educativo?: string;
  fecha_ingreso?: string;
  fecha_retiro?: string;
  estado?: string;
  razon_estado?: string;
}

export interface CreateCargoDto {
  cargo: string;
  departamento?: string;
  salario: number;
  tipo_salario?: string;
  fecha_inicio: string;
  motivo_cambio?: string;
}

export interface ConfirmarDocumentoDto {
  tipo: string;
  s3_key: string;
  s3_url: string;
  mime_type?: string;
  tamano_bytes?: number;
  nombre_archivo?: string;
}

export interface PresignedUrlDto {
  tipo: string;
  contentType: string;
  empleado_id: number;
}
