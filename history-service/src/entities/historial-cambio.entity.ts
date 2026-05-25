export interface HistorialCambio {
  id: number;
  empleado_id: number;
  tipo_accion: string | null;
  entidad: string;
  entidad_id: number | null;
  campo_modificado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  usuario_modificador: string;
  rol_modificador: string | null;
  ip_origen: string | null;
  user_agent: string | null;
  fecha_modificacion: Date;
}
