import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE "historial_cambios"
    ADD COLUMN IF NOT EXISTS "tipo_accion" VARCHAR(100);
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE "historial_cambios"
    DROP COLUMN IF EXISTS "tipo_accion";
  `);
};
