export type TipoFestivo = 'nacional' | 'regional' | 'empresarial';

export interface Festivo {
  id: number;
  fecha: Date;
  descripcion: string;
  anio: number;
  tipo: TipoFestivo;
  activo: boolean;
}
