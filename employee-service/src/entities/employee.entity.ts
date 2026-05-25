export type TipoDocumento = 'cedula_ciudadania' | 'cedula_extranjeria' | 'pasaporte' | 'tarjeta_identidad';
export type Genero = 'masculino' | 'femenino' | 'otro' | 'prefiero_no_decir';
export type EstadoEmpleado = 'activo' | 'inactivo' | 'vacaciones' | 'licencia' | 'retirado' | 'transicion';
export type NivelEducativo = 'bachiller' | 'tecnico' | 'tecnologo' | 'universitario' | 'posgrado' | 'especialista' | 'magister' | 'doctorado';
export type TipoSalario = 'fijo' | 'variable' | 'por_hora';
export type TipoDocumentoS3 = 'foto' | 'hoja_vida' | 'certificado' | 'diploma' | 'contrato_firmado' | 'otro';

export interface Empleado {
  id: number;
  empresa_id?: number | null;
  cedula: string;
  tipo_documento: TipoDocumento;
  nombre: string;
  apellido: string;
  genero: Genero | null;
  fecha_nacimiento: Date | null;
  celular: string | null;
  telefono_fijo: string | null;
  correo_personal: string | null;
  correo_corporativo: string;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  nivel_educativo: NivelEducativo | null;
  estado: EstadoEmpleado;
  razon_estado: string | null;
  fecha_ingreso: Date | null;
  fecha_retiro: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type EmployeeChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EmployeeChangeRequest {
  id: number;
  empleado_id: number;
  empresa_id: number | null;
  category: string;
  current_value: string | null;
  requested_value: string | null;
  justification: string;
  status: EmployeeChangeRequestStatus;
  requested_by_email: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CargoSalario {
  id: number;
  empleado_id: number;
  cargo: string;
  departamento: string | null;
  salario: number;
  tipo_salario: TipoSalario;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  activo: boolean;
  motivo_cambio: string | null;
  registrado_por: string | null;
  created_at: Date;
}

export interface DocumentoEmpleado {
  id: number;
  empleado_id: number;
  tipo: TipoDocumentoS3;
  nombre_archivo: string | null;
  s3_key: string;
  s3_url: string;
  mime_type: string | null;
  tamano_bytes: number | null;
  activo: boolean;
  subido_por: string | null;
  aprobado_por: string | null;
  fecha_aprobacion: Date | null;
  created_at: Date;
}
