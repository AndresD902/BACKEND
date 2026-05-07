import { Plan } from '../shared/enums/plan.enum';
import { EstadoEmpresa } from '../shared/enums/estado-empresa.enum';

export interface Empresa {
  id:         number;
  nombre:     string;
  nit:        string;
  correo:     string;
  telefono:   string | null;
  plan:       Plan;
  estado:     EstadoEmpresa;
  created_at: Date;
  updated_at: Date;
}
