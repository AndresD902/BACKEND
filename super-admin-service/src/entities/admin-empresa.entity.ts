export interface AdminEmpresa {
  id:          number;
  empresa_id:  number;
  email:       string;
  nombre:      string | null;
  activo:      boolean;
  creado_en:   Date;
}
