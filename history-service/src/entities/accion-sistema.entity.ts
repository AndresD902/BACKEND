export interface AccionSistema {
  id: number;
  usuario_email: string | null;
  rol: string | null;
  accion: string;
  entidad: string | null;
  entidad_id: number | null;
  resultado: 'exitoso' | 'fallido' | 'denegado';
  detalle: string | null;
  ip_origen: string | null;
  user_agent: string | null;
  fecha: Date;
}
