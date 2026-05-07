import { MigrationBuilder } from 'node-pg-migrate';

// Official list of 32 Colombian departments + Bogotá D.C. (capital district)
const DEPARTMENTS: { nombre: string; descripcion: string }[] = [
  { nombre: 'Amazonas',                descripcion: 'Departamento del Amazonas' },
  { nombre: 'Antioquia',               descripcion: 'Departamento de Antioquia' },
  { nombre: 'Arauca',                  descripcion: 'Departamento de Arauca' },
  { nombre: 'Atlántico',               descripcion: 'Departamento del Atlántico' },
  { nombre: 'Bolívar',                 descripcion: 'Departamento de Bolívar' },
  { nombre: 'Boyacá',                  descripcion: 'Departamento de Boyacá' },
  { nombre: 'Caldas',                  descripcion: 'Departamento de Caldas' },
  { nombre: 'Caquetá',                 descripcion: 'Departamento del Caquetá' },
  { nombre: 'Casanare',                descripcion: 'Departamento de Casanare' },
  { nombre: 'Cauca',                   descripcion: 'Departamento del Cauca' },
  { nombre: 'Cesar',                   descripcion: 'Departamento del Cesar' },
  { nombre: 'Chocó',                   descripcion: 'Departamento del Chocó' },
  { nombre: 'Córdoba',                 descripcion: 'Departamento de Córdoba' },
  { nombre: 'Cundinamarca',            descripcion: 'Departamento de Cundinamarca' },
  { nombre: 'Guainía',                 descripcion: 'Departamento de Guainía' },
  { nombre: 'Guaviare',                descripcion: 'Departamento del Guaviare' },
  { nombre: 'Huila',                   descripcion: 'Departamento del Huila' },
  { nombre: 'La Guajira',              descripcion: 'Departamento de La Guajira' },
  { nombre: 'Magdalena',               descripcion: 'Departamento del Magdalena' },
  { nombre: 'Meta',                    descripcion: 'Departamento del Meta' },
  { nombre: 'Nariño',                  descripcion: 'Departamento de Nariño' },
  { nombre: 'Norte de Santander',      descripcion: 'Departamento de Norte de Santander' },
  { nombre: 'Putumayo',                descripcion: 'Departamento del Putumayo' },
  { nombre: 'Quindío',                 descripcion: 'Departamento del Quindío' },
  { nombre: 'Risaralda',               descripcion: 'Departamento de Risaralda' },
  { nombre: 'San Andrés y Providencia', descripcion: 'Archipiélago de San Andrés, Providencia y Santa Catalina' },
  { nombre: 'Santander',               descripcion: 'Departamento de Santander' },
  { nombre: 'Sucre',                   descripcion: 'Departamento de Sucre' },
  { nombre: 'Tolima',                  descripcion: 'Departamento del Tolima' },
  { nombre: 'Valle del Cauca',         descripcion: 'Departamento del Valle del Cauca' },
  { nombre: 'Vaupés',                  descripcion: 'Departamento del Vaupés' },
  { nombre: 'Vichada',                 descripcion: 'Departamento del Vichada' },
  { nombre: 'Bogotá D.C.',             descripcion: 'Distrito Capital de Bogotá' },
];

export const up = (pgm: MigrationBuilder): void => {
  const values = DEPARTMENTS.map(
    ({ nombre, descripcion }) =>
      `('${nombre.replace(/'/g, "''")}', '${descripcion.replace(/'/g, "''")}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).join(',\n    ');

  pgm.sql(`
    INSERT INTO departamentos_cargo (nombre, descripcion, created_at, updated_at)
    VALUES
    ${values}
    ON CONFLICT (nombre) DO NOTHING;
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  const nombres = DEPARTMENTS.map(({ nombre }) => `'${nombre.replace(/'/g, "''")}'`).join(', ');
  pgm.sql(`DELETE FROM departamentos_cargo WHERE nombre IN (${nombres});`);
};
