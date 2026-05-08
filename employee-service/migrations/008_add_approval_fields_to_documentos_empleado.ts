import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE "documentos_empleado"
      ADD COLUMN IF NOT EXISTS "aprobado_por" VARCHAR(150),
      ADD COLUMN IF NOT EXISTS "fecha_aprobacion" TIMESTAMP(6);
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE "documentos_empleado"
      DROP COLUMN IF EXISTS "aprobado_por",
      DROP COLUMN IF EXISTS "fecha_aprobacion";
  `);
};