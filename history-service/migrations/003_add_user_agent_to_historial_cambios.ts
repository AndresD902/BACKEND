import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE "historial_cambios"
      ADD COLUMN IF NOT EXISTS "user_agent" TEXT;
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    ALTER TABLE "historial_cambios"
      DROP COLUMN IF EXISTS "user_agent";
  `);
};
