import { MigrationBuilder } from 'node-pg-migrate';

const FESTIVOS_2025: [string, string, number][] = [
  ['2025-01-01', 'Año Nuevo',                               2025],
  ['2025-01-06', 'Reyes Magos',                             2025],
  ['2025-03-24', 'San José (trasladado)',                   2025],
  ['2025-04-17', 'Jueves Santo',                            2025],
  ['2025-04-18', 'Viernes Santo',                           2025],
  ['2025-05-01', 'Día del Trabajo',                         2025],
  ['2025-06-02', 'Ascensión del Señor',                     2025],
  ['2025-06-23', 'Corpus Christi',                          2025],
  ['2025-06-30', 'Sagrado Corazón',                         2025],
  ['2025-07-07', 'San Pedro y San Pablo (trasladado)',       2025],
  ['2025-07-20', 'Grito de Independencia',                  2025],
  ['2025-08-07', 'Batalla de Boyacá',                       2025],
  ['2025-08-18', 'Asunción de la Virgen (trasladado)',      2025],
  ['2025-10-13', 'Día de la Raza (trasladado)',              2025],
  ['2025-11-03', 'Todos los Santos (trasladado)',            2025],
  ['2025-11-17', 'Independencia de Cartagena (trasladado)', 2025],
  ['2025-12-08', 'Inmaculada Concepción',                   2025],
  ['2025-12-25', 'Navidad',                                 2025],
];

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const [fecha, descripcion, anio] of FESTIVOS_2025) {
    pgm.sql(`
      INSERT INTO festivos (fecha, descripcion, anio)
      VALUES ('${fecha}', '${descripcion}', ${anio})
      ON CONFLICT (fecha) DO NOTHING;
    `);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql("DELETE FROM festivos WHERE anio = 2025;");
}
